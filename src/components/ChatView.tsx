import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Paperclip, 
  Image as ImageIcon, 
  FileText, 
  Check, 
  CheckCheck, 
  Search, 
  Plus, 
  Users, 
  Clock, 
  CheckSquare, 
  Download, 
  X, 
  ExternalLink, 
  ChevronRight, 
  Smile, 
  FileSpreadsheet, 
  FileCode, 
  FileArchive, 
  Eye, 
  AlertCircle,
  User as UserIcon,
  UserPlus,
  MessageSquare,
  MessageSquarePlus,
  PhoneCall,
  Mail,
  Lock,
  ShieldCheck,
  CheckCircle2,
  Info,
  ArrowLeft
} from 'lucide-react';
import { User, ChatGroup, ChatMessage, Task, UserRole } from '../types';
import { VChatLogo } from './VChatLogo';
import { apiFetch } from '../services/clientStorage';
import { subscribeToCloudMessages, subscribeToCloudChats } from '../services/firebase';


interface ChatViewProps {
  currentUser: User;
  onOpenTask: (taskId: string) => void;
  tasks: Task[];
  directChatTarget?: { id?: string; email?: string } | null;
  onClearDirectChatTarget?: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  currentUser,
  onOpenTask,
  tasks,
  directChatTarget,
  onClearDirectChatTarget
}) => {
  const [chats, setChats] = useState<ChatGroup[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [chatSearch, setChatSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'group' | 'direct'>('all');

  // Attachment state
  const [isUploading, setIsUploading] = useState(false);
  const [attachmentPreview, setAttachmentPreview] = useState<{
    dataBase64: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  } | null>(null);

  // Lightbox for viewing full image
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // New Group Modal
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

  // Direct 1-on-1 Chat Modal
  const [showDirectChatModal, setShowDirectChatModal] = useState(false);
  const [colleagues, setColleagues] = useState<any[]>([]);
  const [colleagueSearch, setColleagueSearch] = useState('');
  const [colleagueRoleFilter, setColleagueRoleFilter] = useState<string>('all');
  const [isLoadingColleagues, setIsLoadingColleagues] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);

  // Group Info / Participants Modal
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);

  // Task link selector modal
  const [showTaskSelector, setShowTaskSelector] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch chats list
  const fetchChats = async () => {
    try {
      const res = await apiFetch('/api/chats', {
        headers: {
          'x-user-id': currentUser.id,
          'Accept': 'application/json'
        }
      });
      if (res.ok) {
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        setChats(data.chats || []);
        if (!activeChatId && data.chats?.length > 0) {
          setActiveChatId(data.chats[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load chats', err);
    }
  };

  // Fetch messages for active chat
  const fetchMessages = async (chatId: string) => {
    if (!chatId) return;
    try {
      const res = await apiFetch(`/api/chats/${chatId}/messages`, {
        headers: {
          'x-user-id': currentUser.id,
          'Accept': 'application/json'
        }
      });
      if (res.ok) {
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to load messages', err);
    }
  };

  // Real-time Cloud Firestore Listeners & Initial Load
  useEffect(() => {
    fetchChats();

    // Subscribe to real-time chat updates across devices
    const unsubChats = subscribeToCloudChats((cloudChats) => {
      if (cloudChats && cloudChats.length > 0) {
        const userEmail = currentUser.email?.toLowerCase();
        const userChats = cloudChats.filter(c =>
          c.participants.includes('all') ||
          c.participants.includes(currentUser.id) ||
          (userEmail && c.participants.some(p => String(p).toLowerCase() === userEmail))
        );
        setChats(userChats);
        if (!activeChatId && userChats.length > 0) {
          setActiveChatId(userChats[0].id);
        }
      }
    });

    return () => {
      unsubChats();
    };
  }, [currentUser.id]);

  useEffect(() => {
    if (!activeChatId) return;

    fetchMessages(activeChatId);

    // Subscribe to instantaneous real-time message stream for active chat
    const unsubMessages = subscribeToCloudMessages(activeChatId, (cloudMsgs) => {
      if (cloudMsgs) {
        setMessages(cloudMsgs);
      }
    });

    return () => {
      unsubMessages();
    };
  }, [activeChatId, currentUser.id]);


  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch branch colleagues for 1-on-1 direct messaging
  const loadColleagues = async () => {
    setIsLoadingColleagues(true);
    try {
      const res = await apiFetch('/api/colleagues', {
        headers: {
          'x-user-id': currentUser.id,
          'Accept': 'application/json'
        }
      });
      if (res.ok) {
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        setColleagues(data.colleagues || []);
      }
    } catch (err) {
      console.error('Failed to load colleagues', err);
    } finally {
      setIsLoadingColleagues(false);
    }
  };

  // Start or open a 1-on-1 direct chat
  const handleStartDirectChat = async (recipientId?: string, recipientEmail?: string) => {
    if (!recipientId && !recipientEmail) return;
    setIsStartingChat(true);
    try {
      const res = await apiFetch('/api/chats/direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({ recipientId, recipientEmail })
      });

      if (res.ok) {
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        const targetChat = data.chat;
        if (targetChat) {
          setChats(prev => {
            const exists = prev.some(c => c.id === targetChat.id);
            return exists ? prev.map(c => c.id === targetChat.id ? targetChat : c) : [targetChat, ...prev];
          });
          setActiveChatId(targetChat.id);
          setShowDirectChatModal(false);
          setShowGroupInfoModal(false);
          setFilterType('all');
        }
      }
    } catch (err) {
      console.error('Failed to create or open direct chat', err);
    } finally {
      setIsStartingChat(false);
    }
  };

  // Handle direct chat target request from other views
  useEffect(() => {
    if (directChatTarget && (directChatTarget.id || directChatTarget.email)) {
      handleStartDirectChat(directChatTarget.id, directChatTarget.email);
      onClearDirectChatTarget?.();
    }
  }, [directChatTarget]);

  // Load employee list for creating groups
  const loadEmployees = async () => {
    try {
      const res = await apiFetch('/api/admin/employees', {
        headers: {
          'x-user-id': currentUser.id,
          'Accept': 'application/json'
        }
      });
      if (res.ok) {
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        setAllEmployees(data.registeredUsers || []);
      }
    } catch {
      // Fallback
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      const res = await apiFetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({
          name: newGroupName.trim(),
          description: newGroupDesc.trim(),
          participants: selectedParticipants,
          type: 'group'
        })
      });

      if (res.ok) {
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        if (data.chat) {
          setChats(prev => [data.chat, ...prev]);
          setActiveChatId(data.chat.id);
        }
        setShowNewGroupModal(false);
        setNewGroupName('');
        setNewGroupDesc('');
        setSelectedParticipants([currentUser.id]);
        fetchChats();
      }
    } catch (err) {
      console.error('Failed to create group', err);
    }
  };

  // Handle file select
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      alert('File size exceeds 25MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachmentPreview({
        dataBase64: reader.result as string,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size
      });
    };
    reader.readAsDataURL(file);
  };

  // Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !attachmentPreview) return;
    if (!activeChatId) return;

    setIsUploading(true);

    try {
      let mediaUrl: string | undefined = undefined;
      let mediaName: string | undefined = undefined;
      let mediaSize: number | undefined = undefined;
      let mediaType: string | undefined = undefined;

      // If attachment exists, upload first
      if (attachmentPreview) {
        const upRes = await apiFetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            fileName: attachmentPreview.fileName,
            fileType: attachmentPreview.fileType,
            dataBase64: attachmentPreview.dataBase64
          })
        });

        if (upRes.ok) {
          const upText = await upRes.text();
          const upData = upText ? JSON.parse(upText) : {};
          mediaUrl = upData.url;
          mediaName = upData.name;
          mediaSize = upData.size;
          mediaType = upData.type;
        }
      }

      const res = await apiFetch(`/api/chats/${activeChatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({
          content: inputText.trim(),
          mediaUrl,
          mediaName,
          mediaSize,
          mediaType,
          type: mediaUrl ? (mediaType?.startsWith('image/') ? 'image' : 'document') : 'text'
        })
      });

      if (res.ok) {
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        if (data.message) {
          setMessages(prev => [...prev, data.message]);
        }
        setInputText('');
        setAttachmentPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setIsUploading(false);
    }
  };

  // Share a task reference directly in chat
  const handleShareTask = async (task: Task) => {
    if (!activeChatId) return;
    try {
      const res = await apiFetch(`/api/chats/${activeChatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify({
          content: `📌 Attached Task: "${task.title}" for Client ${task.clientName} (Assigned to: ${task.assignedToName})`,
          type: 'task_alert',
          taskRef: {
            taskId: task.id,
            title: task.title,
            status: task.status,
            dueDate: task.dueDate
          }
        })
      });

      if (res.ok) {
        const text = await res.text();
        const data = text ? JSON.parse(text) : {};
        if (data.message) {
          setMessages(prev => [...prev, data.message]);
        }
        setShowTaskSelector(false);
      }
    } catch (err) {
      console.error('Error sharing task', err);
    }
  };

  const activeChat = chats.find(c => c.id === activeChatId);

  const filteredChats = chats.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(chatSearch.toLowerCase()) ||
      c.lastMessage?.content.toLowerCase().includes(chatSearch.toLowerCase());
    if (filterType === 'group') return matchesSearch && c.type === 'group';
    if (filterType === 'direct') return matchesSearch && c.type === 'direct';
    return matchesSearch;
  });

  const getRoleColor = (role: UserRole | string) => {
    switch (role) {
      case 'Partner': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'Manager': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'Accountant': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'Paid Assistant': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'Articles': return 'text-indigo-600 bg-indigo-50 border-indigo-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const renderFileIcon = (fileName?: string) => {
    if (!fileName) return <FileText className="w-5 h-5 text-blue-500" />;
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['xlsx', 'xls', 'csv'].includes(ext || '')) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    }
    if (['pdf'].includes(ext || '')) {
      return <FileText className="w-5 h-5 text-rose-600" />;
    }
    if (['zip', 'rar', '7z'].includes(ext || '')) {
      return <FileArchive className="w-5 h-5 text-amber-600" />;
    }
    return <FileText className="w-5 h-5 text-blue-500" />;
  };

  return (
    <div id="chat-view-container" className="h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-[#EFEAE2]/40 relative overflow-hidden">
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* LEFT SIDEBAR: Chat List (WhatsApp style) */}
      <aside className={`w-full md:w-80 lg:w-96 bg-white border-r border-slate-200 flex flex-col shrink-0 ${activeChatId ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Sidebar Header */}
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span className="font-extrabold tracking-tight">
                <span className="text-sky-600">V</span>-Chat
              </span>
              <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded border border-amber-200 shrink-0">
                Branch
              </span>
            </h2>
            <p className="text-[10px] text-slate-500 truncate">Varma &amp; Varma Mumbai</p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              id="btn-direct-chat"
              onClick={() => {
                loadColleagues();
                setShowDirectChatModal(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
              title="Start Individual 1-on-1 Chat with a Colleague"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Direct</span>
            </button>

            <button
              id="btn-new-group"
              onClick={() => {
                loadEmployees();
                setShowNewGroupModal(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
              title="Create New Team Group"
            >
              <Users className="w-3.5 h-3.5" />
              <span>+ Group</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-2.5 bg-white border-b border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search conversations, colleagues, instructions..."
              value={chatSearch}
              onChange={(e) => setChatSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-100 border border-transparent rounded-xl focus:bg-white focus:border-slate-300 outline-none transition"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex gap-1 mt-2 overflow-x-auto pb-0.5">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition shrink-0 ${
                filterType === 'all'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All ({chats.length})
            </button>
            <button
              onClick={() => setFilterType('direct')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition shrink-0 flex items-center gap-1 ${
                filterType === 'direct'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <UserIcon className="w-3 h-3" />
              <span>Direct ({chats.filter(c => c.type === 'direct').length})</span>
            </button>
            <button
              onClick={() => setFilterType('group')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition shrink-0 flex items-center gap-1 ${
                filterType === 'group'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Users className="w-3 h-3" />
              <span>Groups ({chats.filter(c => c.type === 'group').length})</span>
            </button>
          </div>
        </div>

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredChats.length === 0 ? (
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                {filterType === 'direct' ? <UserIcon className="w-6 h-6" /> : <Users className="w-6 h-6" />}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700">
                  {filterType === 'direct' 
                    ? 'No individual chats yet'
                    : 'No conversations found'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                  {filterType === 'direct'
                    ? 'Message any partner, manager, article, or colleague directly 1-on-1.'
                    : 'Try clearing your search or start a new conversation.'}
                </p>
              </div>
              {filterType === 'direct' && (
                <button
                  onClick={() => {
                    loadColleagues();
                    setShowDirectChatModal(true);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Start Individual Chat</span>
                </button>
              )}
            </div>
          ) : (
            filteredChats.map((chat) => {
              const isActive = chat.id === activeChatId;
              const isDirect = chat.type === 'direct';

              return (
                <div
                  key={chat.id}
                  id={`chat-item-${chat.id}`}
                  onClick={() => setActiveChatId(chat.id)}
                  className={`p-3 flex items-start gap-3 cursor-pointer transition relative hover:bg-slate-50 ${
                    isActive 
                      ? isDirect 
                        ? 'bg-blue-50/70 hover:bg-blue-50/90 border-l-4 border-blue-600' 
                        : 'bg-emerald-50/70 hover:bg-emerald-50/90 border-l-4 border-emerald-500'
                      : ''
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm overflow-hidden border ${
                      isDirect 
                        ? 'bg-blue-50 text-blue-800 border-blue-200' 
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}>
                      {isDirect ? (
                        chat.name.substring(0, 2).toUpperCase()
                      ) : (
                        <Users className="w-5 h-5 text-emerald-600" />
                      )}
                    </div>
                    {isDirect ? (
                      <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center" title="1-on-1 Individual Chat">
                        <UserIcon className="w-2.5 h-2.5 text-white" />
                      </span>
                    ) : (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" title="Branch Group" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h3 className="text-xs font-bold text-slate-900 truncate">
                          {chat.name}
                        </h3>
                        {chat.otherParticipant?.role && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border shrink-0 ${getRoleColor(chat.otherParticipant.role)}`}>
                            {chat.otherParticipant.role}
                          </span>
                        )}
                      </div>
                      {chat.lastMessage && (
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(chat.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 truncate mt-0.5 flex items-center gap-1">
                      {!isDirect && chat.lastMessage?.senderName && (
                        <span className="font-semibold text-slate-700 shrink-0">
                          {chat.lastMessage.senderName}:
                        </span>
                      )}
                      <span className="truncate">{chat.lastMessage?.content || 'No messages yet'}</span>
                    </p>
                  </div>

                  {Boolean(chat.unreadCount && chat.unreadCount > 0) && (
                    <div className="shrink-0 flex items-center justify-center">
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-600 text-white rounded-full">
                        {chat.unreadCount}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* RIGHT PANEL: Chat View (Messages & Input) */}
      <main className={`flex-1 flex flex-col bg-[#efeae2]/30 relative ${!activeChatId ? 'hidden md:flex' : 'flex'}`}>
        
        {activeChat ? (
          <>
            {/* Chat Top Header */}
            <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setActiveChatId('')}
                  className="md:hidden p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg shrink-0"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border shrink-0 ${
                  activeChat.type === 'direct'
                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}>
                  {activeChat.type === 'group' ? (
                    <Users className="w-5 h-5 text-emerald-700" />
                  ) : (
                    activeChat.name.substring(0, 2).toUpperCase()
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h2 className="text-sm font-bold text-slate-900 truncate">
                      {activeChat.name}
                    </h2>
                    {activeChat.type === 'direct' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full border border-blue-200 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" />
                        <span>1-on-1 Direct</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200 flex items-center gap-1">
                        <Users className="w-2.5 h-2.5" />
                        <span>Branch Group</span>
                      </span>
                    )}

                    {activeChat.otherParticipant?.role && (
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${getRoleColor(activeChat.otherParticipant.role)}`}>
                        {activeChat.otherParticipant.role}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate max-w-md mt-0.5 flex items-center gap-2">
                    {activeChat.type === 'direct' ? (
                      <>
                        {activeChat.otherParticipant?.email && (
                          <span className="font-mono text-slate-600">{activeChat.otherParticipant.email}</span>
                        )}
                        {activeChat.otherParticipant?.phone && (
                          <span>• {activeChat.otherParticipant.phone}</span>
                        )}
                        <span>• Private 1-on-1 chat</span>
                      </>
                    ) : (
                      <span>{activeChat.description || 'Varma & Varma internal branch communication'}</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {activeChat.type === 'group' && (
                  <button
                    onClick={() => setShowGroupInfoModal(true)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                    title="View Group Members & Message Directly"
                  >
                    <Users className="w-3.5 h-3.5 text-slate-600" />
                    <span className="hidden sm:inline">
                      Members ({activeChat.participantDetails?.length || activeChat.participants?.length || 0})
                    </span>
                  </button>
                )}

                <button
                  onClick={() => setShowTaskSelector(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-semibold transition"
                  title="Link or Share Task in Chat"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-amber-700" />
                  <span className="hidden sm:inline">Share Task</span>
                </button>
              </div>
            </div>

            {/* Messages Feed */}
            <div 
              id="messages-scroll-feed"
              className="flex-1 overflow-y-auto p-4 space-y-3"
              style={{
                backgroundImage: 'radial-gradient(#cbd5e1 0.75px, transparent 0.75px)',
                backgroundSize: '16px 16px'
              }}
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto">
                  <div className={`w-14 h-14 rounded-2xl shadow-sm flex items-center justify-center mb-3 ${
                    activeChat.type === 'direct' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-white text-slate-400'
                  }`}>
                    {activeChat.type === 'direct' ? <UserIcon className="w-7 h-7" /> : <Users className="w-7 h-7" />}
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {activeChat.type === 'direct'
                      ? `Direct conversation with ${activeChat.name}`
                      : 'No messages in this group yet'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    {activeChat.type === 'direct'
                      ? `This is a private 1-on-1 conversation. Messages, working papers, and task updates shared here are confidential between you and ${activeChat.name} (${activeChat.otherParticipant?.role || 'Colleague'}).`
                      : 'Send instructions, audit queries, working papers, or ask for updates from team members.'}
                  </p>
                  {activeChat.type === 'direct' && (
                    <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-800 rounded-full text-[11px] font-semibold border border-blue-200">
                      <Lock className="w-3 h-3 text-blue-600" />
                      <span>End-to-end branch confidentiality</span>
                    </div>
                  )}
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderId === currentUser.id;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-md md:max-w-lg rounded-2xl px-3.5 py-2.5 shadow-xs transition ${
                          isMine
                            ? 'bg-[#DCF8C6] text-slate-900 rounded-tr-xs border border-emerald-200/60'
                            : 'bg-white text-slate-900 rounded-tl-xs border border-slate-200'
                        }`}
                      >
                        {/* Sender info (only in group chats) */}
                        {!isMine && activeChat.type === 'group' && (
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-xs font-bold text-slate-900">
                              {msg.senderName}
                            </span>
                            <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded border ${getRoleColor(msg.senderRole)}`}>
                              {msg.senderRole}
                            </span>
                          </div>
                        )}

                        {/* If Task Alert or Linked Task */}
                        {msg.taskRef && (
                          <div className="my-1.5 p-2.5 bg-amber-50/90 rounded-xl border border-amber-300 text-xs space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-amber-900 flex items-center gap-1">
                                <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
                                <span>CA Task Card</span>
                              </span>
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                msg.taskRef.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                                msg.taskRef.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                                'bg-amber-100 text-amber-800'
                              }`}>
                                {msg.taskRef.status}
                              </span>
                            </div>
                            <p className="font-semibold text-slate-900">{msg.taskRef.title}</p>
                            <div className="flex items-center justify-between pt-1 border-t border-amber-200/60 text-[11px]">
                              <span className="text-slate-600">Due: {msg.taskRef.dueDate}</span>
                              <button
                                onClick={() => onOpenTask(msg.taskRef!.taskId)}
                                className="text-amber-800 font-bold hover:underline flex items-center gap-0.5"
                              >
                                <span>Open Details</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Image Attachment */}
                        {msg.type === 'image' && msg.mediaUrl && (
                          <div className="my-1.5 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100">
                            <img
                              src={msg.mediaUrl}
                              alt={msg.mediaName || 'Image attachment'}
                              className="max-h-64 w-full object-cover cursor-pointer hover:opacity-95 transition"
                              onClick={() => setSelectedImage(msg.mediaUrl!)}
                            />
                            {msg.mediaName && (
                              <div className="p-1.5 text-[11px] text-slate-600 truncate bg-white">
                                {msg.mediaName}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Document Attachment */}
                        {msg.type === 'document' && msg.mediaUrl && (
                          <div className="my-1.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                                {renderFileIcon(msg.mediaName)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-900 truncate">
                                  {msg.mediaName || 'Document file'}
                                </p>
                                <p className="text-[10px] text-slate-500">
                                  {msg.mediaSize ? `${(msg.mediaSize / 1024).toFixed(1)} KB` : 'Working paper'}
                                </p>
                              </div>
                            </div>

                            <a
                              href={msg.mediaUrl}
                              download={msg.mediaName || 'attachment'}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition shrink-0 flex items-center gap-1"
                              title="Download document"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        )}

                        {/* Main Text Content */}
                        {msg.content && (
                          <p className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap break-words">
                            {msg.content}
                          </p>
                        )}

                        {/* Timestamp and Read Status */}
                        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400">
                          <span>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMine && (
                            <CheckCheck className="w-3.5 h-3.5 text-sky-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Selected Attachment Preview Banner */}
            {attachmentPreview && (
              <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-amber-900">
                  <Paperclip className="w-4 h-4 text-amber-600" />
                  <span className="font-semibold truncate max-w-xs">{attachmentPreview.fileName}</span>
                  <span className="text-slate-500">({(attachmentPreview.fileSize / 1024).toFixed(1)} KB)</span>
                </div>
                <button
                  onClick={() => {
                    setAttachmentPreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="p-1 text-slate-500 hover:text-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Bottom Message Input */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition"
                title="Attach Document or Image"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <input
                id="chat-input-message"
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type instructions, task update, or follow-up note..."
                className="flex-1 py-2 px-3 text-sm bg-slate-100 border border-transparent rounded-xl focus:bg-white focus:border-slate-300 outline-none transition"
              />

              <button
                id="btn-send-message"
                type="submit"
                disabled={(!inputText.trim() && !attachmentPreview) || isUploading}
                className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition disabled:opacity-40 disabled:cursor-not-allowed"
                title="Send Message"
              >
                {isUploading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400 bg-white">
            <div className="mb-4">
              <VChatLogo size="xl" variant="full" theme="light" />
            </div>
            <h3 className="text-base font-bold text-slate-800">Varma &amp; Varma Mumbai Branch</h3>
            <p className="text-xs text-slate-600 font-semibold uppercase tracking-wider mt-0.5">
              Chartered Accountants • Internal Branch Portal
            </p>
            <p className="text-xs text-slate-500 max-w-sm mt-2">
              Select a WhatsApp-style branch group or start a direct conversation to communicate tasks, instructions, and share audit working papers.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full border border-slate-200">
                💬 Instant Group Instructions
              </span>
              <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full border border-slate-200">
                📎 Working Papers &amp; PDF Share
              </span>
              <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full border border-slate-200">
                ✅ Direct Task Linking
              </span>
            </div>
          </div>
        )}
      </main>

      {/* Image Lightbox Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-2 right-2 p-2 bg-slate-900/80 hover:bg-black text-white rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedImage}
              alt="Preview"
              className="max-h-[85vh] max-w-full rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Task Selector Modal (to link task in chat) */}
      {showTaskSelector && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowTaskSelector(false)}
        >
          <div 
            className="w-full max-w-lg bg-white rounded-2xl p-5 shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-amber-600" />
                <span>Share a Task in this Chat</span>
              </h3>
              <button onClick={() => setShowTaskSelector(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 max-h-80 overflow-y-auto space-y-2">
              {tasks.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No tasks available to share.</p>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => handleShareTask(task)}
                    className="p-3 bg-slate-50 hover:bg-amber-50/80 rounded-xl border border-slate-200 hover:border-amber-300 cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900">{task.title}</p>
                      <p className="text-[11px] text-slate-500">
                        Client: {task.clientName} • Due: {task.dueDate} • Assignee: {task.assignedToName}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-amber-700">Share &rarr;</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create New Group Modal */}
      {showNewGroupModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowNewGroupModal(false)}
        >
          <div 
            className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <span>Create WhatsApp-style Team Group</span>
              </h3>
              <button onClick={() => setShowNewGroupModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Group Name *
                </label>
                <input
                  type="text"
                  required
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Statutory Audit - Tata Consumer"
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0F294A] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description / Objective
                </label>
                <input
                  type="text"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="e.g. Audit follow-up, voucher verification and queries"
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0F294A] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Add Participants (Employees)
                </label>
                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2 divide-y divide-slate-100">
                  {allEmployees.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2 text-center">No other employees registered yet.</p>
                  ) : (
                    allEmployees.map((emp) => {
                      const isSelected = selectedParticipants.includes(emp.id);
                      return (
                        <label
                          key={emp.id}
                          className="flex items-center justify-between py-1.5 px-2 hover:bg-slate-50 rounded cursor-pointer text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedParticipants(prev => [...prev, emp.id]);
                                } else {
                                  setSelectedParticipants(prev => prev.filter(id => id !== emp.id));
                                }
                              }}
                              className="rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="font-semibold text-slate-800">{emp.name}</span>
                            <span className="text-[10px] text-slate-500">({emp.role})</span>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewGroupModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* START DIRECT 1-ON-1 CHAT MODAL */}
      {showDirectChatModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowDirectChatModal(false)}
        >
          <div 
            className="w-full max-w-lg bg-white rounded-2xl p-5 sm:p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Start Individual 1-on-1 Chat</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded border border-blue-200">
                      Private
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Select any team member from Varma &amp; Varma Mumbai Branch
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowDirectChatModal(false)} 
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="pt-3 pb-2 space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search colleague by name, designation, email..."
                  value={colleagueSearch}
                  onChange={(e) => setColleagueSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                  autoFocus
                />
                {colleagueSearch && (
                  <button 
                    onClick={() => setColleagueSearch('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Role filter chips */}
              <div className="flex gap-1 overflow-x-auto pb-1 text-[11px]">
                {['all', 'Partner', 'Manager', 'Articles', 'Paid Assistant', 'Accountant'].map((roleKey) => (
                  <button
                    key={roleKey}
                    onClick={() => setColleagueRoleFilter(roleKey)}
                    className={`px-2.5 py-1 rounded-full font-bold transition shrink-0 ${
                      colleagueRoleFilter === roleKey
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {roleKey === 'all' ? 'All Roles' : roleKey}
                  </button>
                ))}
              </div>
            </div>

            {/* Colleagues Directory List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 my-1 pr-1">
              {isLoadingColleagues ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs">Loading Mumbai branch colleagues...</p>
                </div>
              ) : (() => {
                const filtered = colleagues.filter(c => {
                  if (c.id === currentUser.id || c.email?.toLowerCase() === currentUser.email?.toLowerCase()) {
                    return false; // Don't list self
                  }
                  const matchesQuery = 
                    c.name?.toLowerCase().includes(colleagueSearch.toLowerCase()) ||
                    c.email?.toLowerCase().includes(colleagueSearch.toLowerCase()) ||
                    c.role?.toLowerCase().includes(colleagueSearch.toLowerCase()) ||
                    c.phone?.includes(colleagueSearch);
                  
                  if (colleagueRoleFilter === 'all') return matchesQuery;
                  return matchesQuery && c.role === colleagueRoleFilter;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-10 text-center text-slate-400 space-y-1">
                      <p className="text-xs font-semibold text-slate-600">No colleagues found</p>
                      <p className="text-[11px] text-slate-400">Try adjusting your search or role filter.</p>
                    </div>
                  );
                }

                return filtered.map((colleague) => {
                  return (
                    <div
                      key={colleague.id || colleague.email}
                      className="py-3 px-2 flex items-center justify-between gap-3 hover:bg-slate-50/80 rounded-xl transition cursor-pointer group"
                      onClick={() => handleStartDirectChat(colleague.id, colleague.email)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-800 font-bold flex items-center justify-center text-sm border border-blue-200 shrink-0 group-hover:border-blue-400 transition">
                          {colleague.name ? colleague.name.substring(0, 2).toUpperCase() : 'VV'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 transition">
                              {colleague.name}
                            </h4>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${getRoleColor(colleague.role)}`}>
                              {colleague.role}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <span className="font-mono truncate">{colleague.email}</span>
                            {colleague.phone && (
                              <span className="shrink-0">• {colleague.phone}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={isStartingChat}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartDirectChat(colleague.id, colleague.email);
                        }}
                        className="shrink-0 px-3 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-blue-200 hover:border-blue-600 shadow-xs"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </button>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Confidential branch communication</span>
              </span>
              <button
                type="button"
                onClick={() => setShowDirectChatModal(false)}
                className="px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GROUP INFO / PARTICIPANTS MODAL */}
      {showGroupInfoModal && activeChat && activeChat.type === 'group' && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowGroupInfoModal(false)}
        >
          <div 
            className="w-full max-w-md bg-white rounded-2xl p-5 sm:p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 truncate max-w-xs">
                    {activeChat.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Group Members &amp; Direct Messaging
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowGroupInfoModal(false)} 
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-2">
              <p className="text-[11px] text-slate-500 font-medium">
                {activeChat.participantDetails?.length || activeChat.participants?.length || 0} participants in this group
              </p>
            </div>

            {/* Participants list */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 my-1">
              {(activeChat.participantDetails || []).map((participant) => {
                const isSelf = participant.id === currentUser.id;

                return (
                  <div key={participant.id || participant.email} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs border border-slate-200 shrink-0">
                        {participant.name ? participant.name.substring(0, 2).toUpperCase() : 'VV'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-slate-900 truncate">
                            {participant.name} {isSelf && <span className="text-slate-400 font-normal">(You)</span>}
                          </p>
                          {participant.role && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${getRoleColor(participant.role)}`}>
                              {participant.role}
                            </span>
                          )}
                        </div>
                        {participant.email && (
                          <p className="text-[10px] text-slate-400 font-mono truncate">{participant.email}</p>
                        )}
                      </div>
                    </div>

                    {!isSelf && (
                      <button
                        onClick={() => handleStartDirectChat(participant.id, participant.email)}
                        className="shrink-0 px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white border border-blue-200 rounded-lg transition flex items-center gap-1 shadow-xs"
                        title={`Message ${participant.name} 1-on-1`}
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Chat 1-on-1</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowGroupInfoModal(false)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
