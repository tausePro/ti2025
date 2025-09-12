'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Send, 
  MessageCircle, 
  Users, 
  Clock,
  Paperclip,
  Image as ImageIcon
} from 'lucide-react'
import { ChatMessage } from '@/types'

interface ChatTabProps {
  projectId: string
}

export function ChatTab({ projectId }: ChatTabProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])

  const { profile } = useAuth()
  const supabase = createClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadMessages()
    setupRealtimeSubscription()
    
    // Focus input on mount
    if (inputRef.current) {
      inputRef.current.focus()
    }

    return () => {
      // Cleanup subscription
      supabase.removeAllChannels()
    }
  }, [projectId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          user:users!user_id(
            id,
            email,
            profile:user_profiles(full_name, avatar_url)
          )
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (error: any) {
      console.error('Error loading messages:', error)
      setError(error.message || 'Error al cargar los mensajes')
    } finally {
      setLoading(false)
    }
  }

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`project-chat-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `project_id=eq.${projectId}`
        },
        async (payload) => {
          // Fetch the complete message with user data
          const { data } = await supabase
            .from('chat_messages')
            .select(`
              *,
              user:users!user_id(
                id,
                email,
                profile:user_profiles(full_name, avatar_url)
              )
            `)
            .eq('id', payload.new.id)
            .single()

          if (data) {
            setMessages(prev => [...prev, data])
          }
        }
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const users = Object.keys(state)
        setOnlineUsers(users)
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        setOnlineUsers(prev => [...prev, key])
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUsers(prev => prev.filter(user => user !== key))
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && profile?.id) {
          await channel.track({
            user_id: profile.id,
            online_at: new Date().toISOString()
          })
        }
      })
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim() || !profile?.id || sending) return

    setSending(true)
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          project_id: projectId,
          user_id: profile.id,
          message: newMessage.trim(),
          message_type: 'text'
        })

      if (error) throw error
      
      setNewMessage('')
      if (inputRef.current) {
        inputRef.current.focus()
      }
    } catch (error: any) {
      console.error('Error sending message:', error)
      setError(error.message || 'Error al enviar el mensaje')
    } finally {
      setSending(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString('es-CO', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    } else {
      return date.toLocaleDateString('es-CO', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }
  }

  const getUserInitials = (user: any) => {
    const name = user?.profile?.full_name || user?.email || 'U'
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const isConsecutiveMessage = (currentMsg: ChatMessage, prevMsg: ChatMessage | undefined) => {
    if (!prevMsg) return false
    
    const timeDiff = new Date(currentMsg.created_at).getTime() - new Date(prevMsg.created_at).getTime()
    const fiveMinutes = 5 * 60 * 1000
    
    return currentMsg.user_id === prevMsg.user_id && timeDiff < fiveMinutes
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <MessageCircle className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Chat del Proyecto</h3>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Users className="h-4 w-4" />
          <span>{onlineUsers.length} en línea</span>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="m-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length > 0 ? (
          messages.map((message, index) => {
            const prevMessage = index > 0 ? messages[index - 1] : undefined
            const isConsecutive = isConsecutiveMessage(message, prevMessage)
            const isOwnMessage = message.user_id === profile?.id

            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} ${
                  isConsecutive ? 'mt-1' : 'mt-4'
                }`}
              >
                <div className={`flex max-w-[70%] ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  {!isConsecutive && (
                    <Avatar className={`h-8 w-8 ${isOwnMessage ? 'ml-2' : 'mr-2'}`}>
                      <AvatarImage src={message.user?.profile?.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {getUserInitials(message.user)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  {/* Message bubble */}
                  <div className={`${isConsecutive && !isOwnMessage ? 'ml-10' : ''} ${isConsecutive && isOwnMessage ? 'mr-10' : ''}`}>
                    {/* User name and time */}
                    {!isConsecutive && (
                      <div className={`flex items-center space-x-2 mb-1 ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        <span className="text-sm font-medium text-gray-700">
                          {message.user?.profile?.full_name || message.user?.email || 'Usuario'}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatTime(message.created_at)}
                        </span>
                      </div>
                    )}
                    
                    {/* Message content */}
                    <div
                      className={`px-3 py-2 rounded-lg ${
                        isOwnMessage
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      } ${
                        isConsecutive
                          ? isOwnMessage
                            ? 'rounded-tr-sm'
                            : 'rounded-tl-sm'
                          : ''
                      }`}
                    >
                      {message.message_type === 'text' ? (
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.message}
                        </p>
                      ) : message.message_type === 'image' ? (
                        <div className="space-y-2">
                          <img
                            src={message.attachment_url}
                            alt="Imagen compartida"
                            className="max-w-full h-auto rounded"
                          />
                          {message.message && (
                            <p className="text-sm">{message.message}</p>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <Paperclip className="h-4 w-4" />
                          <span className="text-sm">{message.message}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <MessageCircle className="h-12 w-12 mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay mensajes aún</h3>
            <p className="text-center">
              Sé el primero en enviar un mensaje en este chat del proyecto.
            </p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t p-4">
        <form onSubmit={sendMessage} className="flex space-x-2">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe un mensaje..."
              disabled={sending}
              className="pr-20"
              maxLength={1000}
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex space-x-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                disabled={sending}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                disabled={sending}
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Button type="submit" disabled={!newMessage.trim() || sending}>
            {sending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
        <p className="text-xs text-gray-500 mt-1">
          Presiona Enter para enviar • {newMessage.length}/1000
        </p>
      </div>
    </div>
  )
}
