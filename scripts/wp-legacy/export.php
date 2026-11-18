<?php
/**
 * Exportador de SOLO LECTURA de la plataforma anterior (app.talentoinmobiliario.com).
 *
 * Lo ejecuta scripts/wp-legacy/migrate.mjs por SSH con WP-CLI, sin plugins ni
 * tema (no se ejecuta código de terceros):
 *   wp eval "<este archivo sin la etiqueta de apertura>" --skip-plugins --skip-themes
 *
 * Solo hace SELECT y escribe JSON Lines por stdout. No modifica la base de
 * datos ni el disco del servidor.
 *
 * Variable de entorno opcional TI_SINCE ('YYYY-MM-DD HH:MM:SS', GMT): limita
 * informes y documentos a los modificados después de esa fecha (sincronización
 * incremental). Empresas, residentes, usuarios y proyectos se exportan siempre.
 */

global $wpdb;

$since = getenv('TI_SINCE') ?: null;
$counts = [];

$emit = function (string $type, array $data) use (&$counts) {
    $counts[$type] = ($counts[$type] ?? 0) + 1;
    echo json_encode(
        ['type' => $type] + $data,
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE
    ), "\n";
};

// Definiciones de campos Toolset: nombre visible, tipo y si es repetible.
$defs = function ($option): array {
    $out = [];
    foreach ((array) get_option($option) as $slug => $d) {
        $out[$slug] = [
            'name' => $d['name'] ?? $slug,
            'type' => $d['type'] ?? null,
            'repetitive' => !empty($d['data']['repetitive']),
        ];
    }
    return $out;
};
$postFieldDefs = $defs('wpcf-fields');
$userFieldDefs = $defs('wpcf-usermeta');

// Relaciones Toolset: IDs de post de padre, hijo e intermediario.
$relation = function (string $slug) use ($wpdb): array {
    $t = $wpdb->prefix;
    return $wpdb->get_results($wpdb->prepare(
        "SELECT ep.element_id AS parent_id, ec.element_id AS child_id, ei.element_id AS intermediary_id
         FROM {$t}toolset_associations a
         JOIN {$t}toolset_relationships r ON r.id = a.relationship_id
         JOIN {$t}toolset_connected_elements ep ON ep.group_id = a.parent_id
         JOIN {$t}toolset_connected_elements ec ON ec.group_id = a.child_id
         LEFT JOIN {$t}toolset_connected_elements ei ON ei.group_id = a.intermediary_id
         WHERE r.slug = %s",
        $slug
    ), ARRAY_A);
};

// Campos wpcf-* de un grupo de posts. Los repetibles salen como lista en el
// orden guardado por Toolset; los demás, como el primer valor guardado.
$fields = function (array $ids) use ($wpdb, $postFieldDefs): array {
    if (!$ids) {
        return [];
    }
    $in = implode(',', array_map('intval', $ids));
    $rows = $wpdb->get_results(
        "SELECT meta_id, post_id, meta_key, meta_value FROM {$wpdb->postmeta}
         WHERE post_id IN ($in) AND (meta_key LIKE 'wpcf-%' OR meta_key LIKE '\\_wpcf-%-sort-order')
         ORDER BY meta_id",
        ARRAY_A
    );
    $raw = [];
    foreach ($rows as $r) {
        $raw[(int) $r['post_id']][$r['meta_key']][(int) $r['meta_id']] = $r['meta_value'];
    }
    $out = [];
    foreach ($raw as $postId => $keys) {
        foreach ($keys as $key => $values) {
            if ($key[0] === '_') {
                continue;
            }
            $slug = substr($key, 5);
            if (empty($postFieldDefs[$slug]['repetitive'])) {
                $out[$postId][$slug] = reset($values);
                continue;
            }
            $order = isset($keys["_{$key}-sort-order"]) ? maybe_unserialize(reset($keys["_{$key}-sort-order"])) : null;
            $sorted = [];
            foreach (is_array($order) ? array_map('intval', $order) : [] as $metaId) {
                if (isset($values[$metaId])) {
                    $sorted[] = $values[$metaId];
                    unset($values[$metaId]);
                }
            }
            $out[$postId][$slug] = array_merge($sorted, array_values($values));
        }
    }
    return $out;
};

$posts = function (string $type, ?string $modifiedSince = null) use ($wpdb): array {
    $sql = "SELECT ID, post_title, post_author, post_date, post_date_gmt, post_modified, post_modified_gmt
            FROM {$wpdb->posts} WHERE post_type = %s AND post_status = 'publish'";
    $args = [$type];
    if ($modifiedSince) {
        $sql .= ' AND post_modified_gmt > %s';
        $args[] = $modifiedSince;
    }
    return $wpdb->get_results($wpdb->prepare($sql . ' ORDER BY ID', ...$args), ARRAY_A);
};

$base = fn (array $p) => [
    'wp_id' => (int) $p['ID'],
    'title' => $p['post_title'],
    'author_wp_id' => (int) $p['post_author'],
    'date' => $p['post_date'],
    'date_gmt' => $p['post_date_gmt'],
    'modified' => $p['post_modified'],
    'modified_gmt' => $p['post_modified_gmt'],
];

$emit('field_defs', ['post' => $postFieldDefs, 'user' => $userFieldDefs]);

// Empresas e inmobiliaria
$inmobiliariaDe = [];
foreach ($relation('inmobiliario-empresa') as $a) {
    $inmobiliariaDe[(int) $a['child_id']] = (int) $a['parent_id'];
}
foreach (['inmobiliario', 'empresa'] as $type) {
    $rows = $posts($type);
    $f = $fields(array_column($rows, 'ID'));
    foreach ($rows as $p) {
        $id = (int) $p['ID'];
        $emit('company', $base($p) + [
            'kind' => $type,
            'fields' => $f[$id] ?? (object) [],
            'inmobiliario_wp_id' => $inmobiliariaDe[$id] ?? null,
        ]);
    }
}

// Fichas de residentes (tipo de contenido "residente")
$rows = $posts('residente');
$f = $fields(array_column($rows, 'ID'));
foreach ($rows as $p) {
    $emit('resident', $base($p) + ['fields' => $f[(int) $p['ID']] ?? (object) []]);
}

// Usuarios: roles y campos de usuario Toolset
$capKey = $wpdb->prefix . 'capabilities';
$userMeta = [];
foreach ($wpdb->get_results($wpdb->prepare(
    "SELECT user_id, meta_key, meta_value FROM {$wpdb->usermeta}
     WHERE meta_key = %s OR meta_key IN ('first_name', 'last_name') OR meta_key LIKE 'wpcf-%%'",
    $capKey
), ARRAY_A) as $m) {
    $userMeta[(int) $m['user_id']][$m['meta_key']] = $m['meta_value'];
}
foreach ($wpdb->get_results("SELECT ID, user_login, user_email, display_name, user_registered FROM {$wpdb->users} ORDER BY ID", ARRAY_A) as $u) {
    $id = (int) $u['ID'];
    $meta = $userMeta[$id] ?? [];
    $userFields = [];
    foreach ($meta as $k => $v) {
        if (strpos($k, 'wpcf-') === 0) {
            $userFields[substr($k, 5)] = $v;
        }
    }
    $emit('user', [
        'wp_id' => $id,
        'login' => $u['user_login'],
        'email' => strtolower(trim($u['user_email'])),
        'display_name' => $u['display_name'],
        'first_name' => $meta['first_name'] ?? '',
        'last_name' => $meta['last_name'] ?? '',
        'registered' => $u['user_registered'],
        'roles' => array_keys(array_filter((array) maybe_unserialize($meta[$capKey] ?? ''))),
        'fields' => $userFields ?: (object) [],
    ]);
}

// Proyectos con su empresa y residentes asignados
$empresaDe = [];
foreach ($relation('empresa-proyecto') as $a) {
    $empresaDe[(int) $a['child_id']] = (int) $a['parent_id'];
}
$residentesDe = [];
$intermediarios = [];
foreach ($relation('residente-proyecto') as $a) {
    $residentesDe[(int) $a['child_id']][] = [
        'residente_wp_id' => (int) $a['parent_id'],
        'intermediary_wp_id' => $a['intermediary_id'] ? (int) $a['intermediary_id'] : null,
    ];
    if ($a['intermediary_id']) {
        $intermediarios[] = (int) $a['intermediary_id'];
    }
}
$rolDe = $fields($intermediarios);
$rows = $posts('proyecto');
$f = $fields(array_column($rows, 'ID'));
foreach ($rows as $p) {
    $id = (int) $p['ID'];
    $residentes = array_map(fn ($r) => [
        'residente_wp_id' => $r['residente_wp_id'],
        'rol' => $r['intermediary_wp_id'] ? ($rolDe[$r['intermediary_wp_id']]['rol-del-residente'] ?? null) : null,
    ], $residentesDe[$id] ?? []);
    $emit('project', $base($p) + [
        'fields' => $f[$id] ?? (object) [],
        'empresa_wp_id' => $empresaDe[$id] ?? null,
        'residentes' => $residentes,
    ]);
}

// Informes, en lotes para no cargar todo el HTML en memoria
$proyectoDeInforme = [];
foreach ($relation('proyecto-informe') as $a) {
    $proyectoDeInforme[(int) $a['child_id']] = (int) $a['parent_id'];
}
$emit('report_ids', ['ids' => array_map('intval', $wpdb->get_col(
    "SELECT ID FROM {$wpdb->posts} WHERE post_type = 'informe' AND post_status = 'publish' ORDER BY ID"
))]);
foreach (array_chunk($posts('informe', $since), 50) as $chunk) {
    $f = $fields(array_column($chunk, 'ID'));
    foreach ($chunk as $p) {
        $id = (int) $p['ID'];
        $emit('report', $base($p) + [
            'project_wp_id' => $proyectoDeInforme[$id] ?? null,
            'fields' => $f[$id] ?? (object) [],
        ]);
    }
    $wpdb->flush();
}

// Documentos legales con sus adjuntos
$proyectoDeDocumento = [];
foreach ($relation('proyecto-documento') as $a) {
    $proyectoDeDocumento[(int) $a['child_id']] = (int) $a['parent_id'];
}
$emit('document_ids', ['ids' => array_map('intval', $wpdb->get_col(
    "SELECT ID FROM {$wpdb->posts} WHERE post_type = 'documento' AND post_status = 'publish' ORDER BY ID"
))]);
$uploads = wp_get_upload_dir();
$uploadsPath = function (?string $url) use ($uploads): ?string {
    $url = trim((string) $url);
    foreach ([$uploads['baseurl'], set_url_scheme($uploads['baseurl'], 'http')] as $prefix) {
        if ($url !== '' && strpos($url, $prefix . '/') === 0) {
            return rawurldecode(strtok(substr($url, strlen($prefix) + 1), '?#'));
        }
    }
    return null;
};

$rows = $posts('documento', $since);
$f = $fields(array_column($rows, 'ID'));
$archivos = [];
if ($rows) {
    // Adjuntos colgados del documento y archivo del campo doc-adjunto, con su ID de adjunto.
    $in = implode(',', array_map('intval', array_column($rows, 'ID')));
    $attachmentSql = "SELECT a.ID, a.post_parent, a.post_title, a.post_mime_type, m.meta_value AS file
         FROM {$wpdb->posts} a
         JOIN {$wpdb->postmeta} m ON m.post_id = a.ID AND m.meta_key = '_wp_attached_file'
         WHERE a.post_type = 'attachment' AND ";
    foreach ($wpdb->get_results($attachmentSql . "a.post_parent IN ($in) ORDER BY a.ID", ARRAY_A) as $a) {
        $archivos[(int) $a['post_parent']][$a['file']] = [
            'file' => $a['file'],
            'attachment_wp_id' => (int) $a['ID'],
            'title' => $a['post_title'],
            'mime' => $a['post_mime_type'],
        ];
    }
    $campo = [];
    foreach ($rows as $p) {
        $rel = $uploadsPath($f[(int) $p['ID']]['doc-adjunto'] ?? null);
        if ($rel !== null && !isset($archivos[(int) $p['ID']][$rel])) {
            $campo[$rel][] = (int) $p['ID'];
        }
    }
    if ($campo) {
        $list = implode(',', array_map(fn ($r) => $wpdb->prepare('%s', $r), array_keys($campo)));
        $porArchivo = [];
        foreach ($wpdb->get_results($attachmentSql . "m.meta_value IN ($list) ORDER BY a.ID", ARRAY_A) as $a) {
            $porArchivo[$a['file']] = $porArchivo[$a['file']] ?? $a;
        }
        foreach ($campo as $rel => $docIds) {
            $a = $porArchivo[$rel] ?? null;
            foreach ($docIds as $docId) {
                $archivos[$docId][$rel] = [
                    'file' => $rel,
                    'attachment_wp_id' => $a ? (int) $a['ID'] : null,
                    'title' => $a['post_title'] ?? null,
                    'mime' => $a['post_mime_type'] ?? null,
                ];
            }
        }
    }
}
foreach ($rows as $p) {
    $id = (int) $p['ID'];
    $emit('document', $base($p) + [
        'project_wp_id' => $proyectoDeDocumento[$id] ?? null,
        'fields' => $f[$id] ?? (object) [],
        'files' => array_values($archivos[$id] ?? []),
    ]);
}

$emit('meta', [
    'exported_at_gmt' => gmdate('Y-m-d H:i:s'),
    'since' => $since,
    'site' => get_option('siteurl'),
    'uploads_baseurl' => $uploads['baseurl'],
    'counts' => $counts,
]);
