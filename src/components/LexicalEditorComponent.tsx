'use client';

import { $getSelection, $isRangeSelection, FORMAT_TEXT_COMMAND, $createParagraphNode, $getRoot, $createTextNode, $isParagraphNode, $isLineBreakNode, $isTextNode } from 'lexical';
import { useEffect, useCallback, useState, useRef } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LexicalErrorBoundary as ErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import type { LexicalEditor, LexicalNode } from 'lexical';
import { ElementNode } from 'lexical';
import { api } from '../lib/api';
import type { Comment } from '../lib/api';

export interface User {
  id: string;
  name: string;
  avatar?: string;
}

type FormatType = 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code';

const SUPPORTED_FORMATS: readonly FormatType[] = ['bold', 'italic', 'underline', 'strikethrough', 'code'];
const STORAGE_KEY = 'lexical-editor-content';

const INITIAL_CONFIG = {
  namespace: 'CommentEditor',
  theme: {
    root: 'LexicalEditor',
    paragraph: 'editor-paragraph',
    text: {
      bold: 'editor-text-bold',
      italic: 'editor-text-italic',
      underline: 'editor-text-underline',
      strikethrough: 'editor-text-strikethrough',
      code: 'editor-text-code',
    },
  },
  nodes: [],
  onError: (error: Error) => console.error(error),
};

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getTextFormatMarkdown(format: number): { prefix: string; suffix: string } {
  let prefix = '';
  let suffix = '';
  if (format & 1) { prefix += '**'; suffix = '**' + suffix; }
  if (format & 2) { prefix += '_'; suffix = '_' + suffix; }
  if (format & 8) { prefix += '~~'; suffix = '~~' + suffix; }
  if (format & 128) { prefix += '`'; suffix = '`' + suffix; }
  return { prefix, suffix };
}

function nodeToMarkdown(node: LexicalNode): string {
  if ($isTextNode(node)) {
    const text = node.getTextContent();
    const format = node.getFormat();
    const { prefix, suffix } = getTextFormatMarkdown(format);
    return prefix + text + suffix;
  }
  if ($isLineBreakNode(node)) return '\n';
  if (node instanceof ElementNode) {
    const children = node.getChildren();
    const childrenText = children.map(nodeToMarkdown).join('');
    if ($isParagraphNode(node)) return childrenText + '\n\n';
    return childrenText;
  }
  return '';
}

function editorToMarkdown(editor: LexicalEditor): string {
  let markdown = '';
  editor.getEditorState().read(() => {
    const root = $getRoot();
    const children = root.getChildren();
    markdown = children.map(nodeToMarkdown).join('').trim();
  });
  return markdown;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return '今';
  if (minutes < 60) return `${minutes}分前`;
  if (hours < 24) return `${hours}時間前`;
  if (days < 7) return `${days}日前`;
  return date.toLocaleDateString('ja-JP');
}

function EditorRefPlugin({ editorRef }: { editorRef: React.MutableRefObject<LexicalEditor | null> }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editorRef.current = editor;
  }, [editor, editorRef]);
  return null;
}

function ToolbarPlugin({ 
  onSave, 
  onDownload, 
  onShowComments,
  commentCount 
}: { 
  onSave: () => void; 
  onDownload: () => void;
  onShowComments: () => void;
  commentCount: number;
}) {
  const [editor] = useLexicalComposerContext();
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const formats = new Set<string>();
          SUPPORTED_FORMATS.forEach((format) => {
            if (selection.hasFormat(format)) formats.add(format);
          });
          setActiveFormats(formats);
        }
      });
    });
  }, [editor]);

  const toggleFormat = useCallback((format: FormatType) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  }, [editor]);

  return (
    <div className="Toolbar">
      <FormatButton format="bold" active={activeFormats.has('bold')} onClick={() => toggleFormat('bold')}>
        <strong>B</strong>
      </FormatButton>
      <FormatButton format="italic" active={activeFormats.has('italic')} onClick={() => toggleFormat('italic')}>
        <em>I</em>
      </FormatButton>
      <FormatButton format="underline" active={activeFormats.has('underline')} onClick={() => toggleFormat('underline')}>
        <u>U</u>
      </FormatButton>
      <FormatButton format="strikethrough" active={activeFormats.has('strikethrough')} onClick={() => toggleFormat('strikethrough')}>
        <s>S</s>
      </FormatButton>
      <FormatButton format="code" active={activeFormats.has('code')} onClick={() => toggleFormat('code')}>
        {'</>'}
      </FormatButton>
      <div style={{ width: '1px', height: '24px', background: 'var(--border)', margin: '0 8px' }} />
      <button className="ToolbarButton" onClick={onSave} title="Save to localStorage">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
          <polyline points="17 21 17 13 7 13 7 21" />
          <polyline points="7 3 7 8 15 8" />
        </svg>
        Save
      </button>
      <button className="ToolbarButton" onClick={onDownload} title="Download as Markdown">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Download
      </button>
      <button 
        className="ToolbarButton" 
        onClick={onShowComments}
        style={{ position: 'relative' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Comments
        {commentCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            background: 'var(--accent)',
            color: 'white',
            borderRadius: '50%',
            width: '18px',
            height: '18px',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {commentCount}
          </span>
        )}
      </button>
      <div style={{ flex: 1 }} />
    </div>
  );
}

function FormatButton({ format, active, onClick, children }: { format: string; active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      className={`ToolbarButton ${active ? 'active' : ''}`}
      onClick={onClick}
      title={format.charAt(0).toUpperCase() + format.slice(1)}
    >
      {children}
    </button>
  );
}

function InitialContentPlugin({ initialContent }: { initialContent: string | null }) {
  const [editor] = useLexicalComposerContext();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized && initialContent) {
      try {
        const parsedState = JSON.parse(initialContent);
        editor.update(() => {
          const root = $getRoot();
          root.clear();
          root.append(parsedState);
        });
        setInitialized(true);
      } catch (e) {
        console.error('Failed to parse initial content:', e);
        setInitialized(true);
      }
    } else if (!initialized) {
      editor.update(() => {
        const root = $getRoot();
        if (root.isEmpty()) {
          const paragraph = $createParagraphNode();
          const text = $createTextNode('Start typing your content here...');
          paragraph.append(text);
          root.append(paragraph);
        }
      });
      setInitialized(true);
    }
  }, [editor, initialContent, initialized]);

  return null;
}

function CommentPopover({ 
  position, 
  selectedText, 
  onSubmit, 
  onClose 
}: { 
  position: { x: number; y: number }; 
  selectedText: string;
  onSubmit: (content: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState('');

  return (
    <div 
      className="CommentPopover" 
      style={{ 
        left: position.x, 
        top: position.y + 10,
        position: 'absolute',
        zIndex: 1000,
        minWidth: '320px',
      }}
    >
      <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--text)', opacity: 0.7 }}>
        選択範囲: "{selectedText.length > 40 ? selectedText.slice(0, 40) + '...' : selectedText}"
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="コメントを入力..."
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            if (text.trim()) onSubmit(text);
          }
          if (e.key === 'Escape') onClose();
        }}
        style={{
          width: '100%',
          minHeight: '80px',
          padding: '8px',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          fontFamily: 'inherit',
          fontSize: '14px',
          resize: 'vertical',
          background: 'var(--bg)',
          color: 'var(--text-h)',
        }}
      />
      <div style={{ fontSize: 11, color: 'var(--text)', opacity: 0.5, marginTop: 4 }}>
        Ctrl+Enter で送信
      </div>
      <div className="CommentPopoverActions">
        <button className="CommentButton secondary" onClick={onClose}>キャンセル</button>
        <button className="CommentButton primary" onClick={() => text.trim() && onSubmit(text)}>追加</button>
      </div>
    </div>
  );
}

function CommentThread({ 
  comment, 
  onResolve, 
  onReply, 
  onDelete,
  currentUserId
}: { 
  comment: Comment; 
  onResolve: (id: string, resolved: boolean) => void;
  onReply: (commentId: string, content: string) => void;
  onDelete: (id: string) => void;
  currentUserId: string;
}) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '12px',
      background: comment.resolved ? 'var(--social-bg)' : 'var(--bg)',
      opacity: comment.resolved ? 0.8 : 1,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {comment.userImage ? (
            <img
              src={comment.userImage}
              alt={comment.userName}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
              }}
            />
          ) : (
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--accent)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 'bold',
            }}>
              {comment.userName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 500, fontSize: '14px' }}>{comment.userName}</div>
            <div style={{ fontSize: '12px', color: 'var(--text)', opacity: 0.7 }}>
              {formatDate(comment.createdAt)}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => onResolve(comment.id, !comment.resolved)}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              border: comment.resolved ? '1px solid var(--accent)' : '1px solid var(--border)',
              borderRadius: '4px',
              background: comment.resolved ? 'var(--accent)' : 'transparent',
              color: comment.resolved ? 'white' : 'var(--text)',
              cursor: 'pointer',
            }}
          >
            {comment.resolved ? '解決済み' : '解決する'}
          </button>
          {comment.userId === currentUserId && (
            <button
              onClick={() => onDelete(comment.id)}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                background: 'transparent',
                color: '#e53e3e',
                cursor: 'pointer',
              }}
            >
              削除
            </button>
          )}
        </div>
      </div>

      <div style={{
        background: 'var(--accent-bg)',
        padding: '8px 12px',
        borderRadius: '4px',
        marginBottom: '12px',
        fontSize: '13px',
        color: 'var(--text-h)',
        borderLeft: '3px solid var(--accent)',
      }}>
        "{comment.selectedText}"
      </div>

      <div style={{ fontSize: '14px', lineHeight: 1.5 }}>
        {comment.content}
      </div>

      {comment.replies.length > 0 && (
        <div style={{ marginTop: '12px', paddingLeft: '16px', borderLeft: '2px solid var(--border)' }}>
          {comment.replies.map((reply) => (
            <div key={reply.id} style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                {reply.userImage ? (
                  <img
                    src={reply.userImage}
                    alt={reply.userName}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                    }}
                  />
                ) : (
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'var(--social-bg)',
                    color: 'var(--text-h)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 'bold',
                  }}>
                    {reply.userName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span style={{ fontSize: '13px', fontWeight: 500 }}>{reply.userName}</span>
                <span style={{ fontSize: '12px', color: 'var(--text)', opacity: 0.7 }}>
                  {formatDate(reply.createdAt)}
                </span>
              </div>
              <div style={{ fontSize: '13px', paddingLeft: '32px' }}>{reply.content}</div>
            </div>
          ))}
        </div>
      )}

      {showReply ? (
        <div style={{ marginTop: '12px' }}>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="返信を入力..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                if (replyText.trim()) {
                  onReply(comment.id, replyText);
                  setReplyText('');
                  setShowReply(false);
                }
              }
              if (e.key === 'Escape') setShowReply(false);
            }}
            style={{
              width: '100%',
              minHeight: '60px',
              padding: '8px',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              fontFamily: 'inherit',
              fontSize: '13px',
              resize: 'vertical',
              background: 'var(--bg)',
              color: 'var(--text-h)',
            }}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
            <button 
              className="CommentButton secondary" 
              onClick={() => { setShowReply(false); setReplyText(''); }}
            >
              キャンセル
            </button>
            <button 
              className="CommentButton primary" 
              onClick={() => {
                if (replyText.trim()) {
                  onReply(comment.id, replyText);
                  setReplyText('');
                  setShowReply(false);
                }
              }}
            >
              返信
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowReply(true)}
          style={{
            marginTop: '12px',
            padding: '4px 12px',
            fontSize: '13px',
            border: 'none',
            background: 'transparent',
            color: 'var(--accent)',
            cursor: 'pointer',
          }}
        >
          返信する
        </button>
      )}
    </div>
  );
}

interface LexicalEditorProps {
  onShowComments?: () => void;
  user?: User;
}

export default function LexicalEditorComponent({ onShowComments, user }: LexicalEditorProps) {
  const [selectedText, setSelectedText] = useState('');
  const [showPopover, setShowPopover] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const [savedMessage, setSavedMessage] = useState(false);
  const [initialContent] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [comments, setComments] = useState<Comment[]>([]);
  const editorRef = useRef<LexicalEditor | null>(null);

  useEffect(() => {
    if (user) {
      api.getComments()
        .then(setComments)
        .catch(console.error);
    }
  }, [user]);

  const handleSave = useCallback(() => {
    if (editorRef.current) {
      const editorState = editorRef.current.getEditorState();
      const json = JSON.stringify(editorState.toJSON());
      localStorage.setItem(STORAGE_KEY, json);
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 2000);
    }
  }, []);

  const handleDownload = useCallback(() => {
    if (editorRef.current) {
      const markdown = editorToMarkdown(editorRef.current);
      const timestamp = new Date().toISOString().slice(0, 10);
      downloadFile(markdown, `lexical-content-${timestamp}.md`, 'text/markdown');
    }
  }, []);

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const text = range.toString().trim();
      if (text && text.length > 0) {
        const rect = range.getBoundingClientRect();
        setSelectedText(text);
        setPopoverPosition({ x: rect.left, y: rect.bottom + window.scrollY });
        setShowPopover(true);
      }
    }
  }, []);

  const handleAddComment = useCallback(async (content: string) => {
    if (!user) return;
    try {
      const newComment = await api.createComment({
        content,
        selectedText,
      });
      setComments(prev => [newComment, ...prev]);
      setShowPopover(false);
      setSelectedText('');
      window.getSelection()?.removeAllRanges();
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  }, [selectedText, user]);

  return (
    <div className="LexicalEditorWrapper">
      <div style={{ position: 'relative' }}>
        <LexicalComposer initialConfig={INITIAL_CONFIG}>
          <EditorRefPlugin editorRef={editorRef} />
          <ToolbarPlugin 
            onSave={handleSave} 
            onDownload={handleDownload}
            onShowComments={onShowComments || (() => {})}
            commentCount={comments.filter(c => !c.resolved).length}
          />
          <div className="EditorContainer">
            <div className="EditorContent" onMouseUp={handleTextSelection}>
              <RichTextPlugin
                contentEditable={<ContentEditable className="LexicalEditor" />}
                placeholder={<div className="EditorPlaceholder">Start typing your content...</div>}
                ErrorBoundary={ErrorBoundary}
              />
            </div>
          </div>
          <HistoryPlugin />
          <OnChangePlugin onChange={() => {}} />
          <InitialContentPlugin initialContent={initialContent} />
        </LexicalComposer>
        {savedMessage && (
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: 'var(--accent)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '14px',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease-in',
          }}>
            保存しました！
          </div>
        )}
      </div>
      
      {showPopover && (
        <CommentPopover 
          position={popoverPosition}
          selectedText={selectedText}
          onSubmit={handleAddComment}
          onClose={() => {
            setShowPopover(false);
            setSelectedText('');
            window.getSelection()?.removeAllRanges();
          }}
        />
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export function CommentList({ onClose, user }: { onClose: () => void; user?: User }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getComments()
      .then(setComments)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleResolve = useCallback(async (id: string, resolved: boolean) => {
    try {
      const updated = await api.resolveComment(id, resolved);
      setComments(prev => prev.map(c => c.id === id ? updated : c));
    } catch (error) {
      console.error('Failed to resolve comment:', error);
    }
  }, []);

  const handleReply = useCallback(async (commentId: string, content: string) => {
    if (!user) return;
    try {
      const newReply = await api.createReply(commentId, {
        content,
      });
      setComments(prev => prev.map(c => 
        c.id === commentId ? { ...c, replies: [...c.replies, newReply] } : c
      ));
    } catch (error) {
      console.error('Failed to add reply:', error);
    }
  }, [user]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await api.deleteComment(id);
      setComments(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  }, []);

  const filteredComments = comments.filter(c => {
    if (filter === 'open') return !c.resolved;
    if (filter === 'resolved') return c.resolved;
    return true;
  });

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      zIndex: 2000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
    }}>
      <div style={{
        background: 'var(--bg)',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '80vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>コメント一覧</h2>
          <button
            onClick={onClose}
            style={{
              padding: '8px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '20px',
              color: 'var(--text)',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          gap: '8px',
        }}>
          {(['all', 'open', 'resolved'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 12px',
                border: '1px solid',
                borderColor: filter === f ? 'var(--accent)' : 'var(--border)',
                borderRadius: '16px',
                background: filter === f ? 'var(--accent)' : 'transparent',
                color: filter === f ? 'white' : 'var(--text)',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {f === 'all' ? 'すべて' : f === 'open' ? '未解決' : '解決済み'}
              <span style={{ marginLeft: '4px', opacity: 0.7 }}>
                ({f === 'all' ? comments.length : comments.filter(c => 
                  f === 'open' ? !c.resolved : c.resolved
                ).length})
              </span>
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--text)', padding: '40px' }}>
              読み込み中...
            </div>
          ) : filteredComments.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text)', padding: '40px' }}>
              コメントはありません
            </div>
          ) : (
            filteredComments.map((comment) => (
              <CommentThread
                key={comment.id}
                comment={comment}
                onResolve={handleResolve}
                onReply={handleReply}
                onDelete={handleDelete}
                currentUserId={user?.id || ''}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
