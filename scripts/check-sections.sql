-- Verificar plantillas
SELECT id, template_name, is_active 
FROM report_templates 
WHERE template_name LIKE '%Quincenal%';

-- Verificar secciones
SELECT 
  st.id,
  st.section_key,
  st.section_name,
  st.section_order,
  st.is_active,
  rt.template_name
FROM section_templates st
LEFT JOIN report_templates rt ON st.report_template_id = rt.id
WHERE rt.template_name LIKE '%Quincenal%'
ORDER BY st.section_order;

-- Contar secciones activas
SELECT COUNT(*) as total_secciones
FROM section_templates
WHERE is_active = true;
