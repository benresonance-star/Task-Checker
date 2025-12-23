import React, { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import { 
  Bold, Italic, Underline as UnderlineIcon, List, 
  ListOrdered, Link as LinkIcon, Highlighter, 
  ArrowRight, Image as ImageIcon,
  Maximize2
} from 'lucide-react';
import { Button } from '../ui/Button';
import { clsx } from 'clsx';

interface NoteEditorProps {
  content: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
}

// Image Node View Component for Manual Resizing
const ImageNodeView = ({ node, updateAttributes, selected }: any) => {
  const [resizing, setResizing] = useState(false);
  const [localWidth, setLocalWidth] = useState(node.attrs.width || '100%');
  const containerRef = useRef<HTMLDivElement>(null);
  const widthRef = useRef(node.attrs.width || '100%');

  // Sync local width with node attributes when not resizing
  useEffect(() => {
    if (!resizing && node.attrs.width) {
      setLocalWidth(node.attrs.width);
      widthRef.current = node.attrs.width;
    }
  }, [node.attrs.width, resizing]);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Stop selection events from resetting state
    
    setResizing(true);

    const startX = e.clientX;
    const currentContainer = containerRef.current;
    if (!currentContainer) return;

    const startWidth = currentContainer.offsetWidth;
    // Walk up to find the prose editor container for accurate percentage calculation
    const proseContainer = currentContainer.closest('.ProseMirror') as HTMLElement;
    const parentWidth = proseContainer?.offsetWidth || currentContainer.parentElement?.offsetWidth || 1;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidthPx = startWidth + deltaX;
      const widthPercentage = Math.max(10, Math.min(100, (newWidthPx / parentWidth) * 100));
      const newWidth = `${widthPercentage.toFixed(2)}%`;
      setLocalWidth(newWidth);
      widthRef.current = newWidth;
    };

    const onMouseUp = () => {
      setResizing(false);
      updateAttributes({ width: widthRef.current });
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const imageContent = (
    <img 
      src={node.attrs.src} 
      className={clsx(
        "w-full rounded-xl border select-none block",
        selected ? "border-google-blue" : "border-gray-200 dark:border-gray-800",
        resizing && "opacity-80"
      )}
      alt={node.attrs.alt}
    />
  );

  return (
    <NodeViewWrapper 
      className={clsx(
        "relative inline-block max-w-full leading-none transition-shadow duration-200",
        selected && "ring-2 ring-google-blue rounded-xl"
      )} 
      style={{ width: localWidth }}
    >
      <div ref={containerRef} className="relative w-full">
        {node.attrs.href ? (
          <a href={node.attrs.href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.preventDefault()}>
            {imageContent}
          </a>
        ) : (
          imageContent
        )}
        
        {/* Resize Handle */}
        <div 
          onMouseDown={onMouseDown}
          className={clsx(
            "absolute bottom-0 right-0 w-8 h-8 flex items-center justify-center cursor-nwse-resize z-10",
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          <div className="w-6 h-6 bg-google-blue text-white rounded-lg flex items-center justify-center shadow-lg transform translate-x-1/3 translate-y-1/3">
            <Maximize2 className="w-3 h-3 rotate-90" />
          </div>
        </div>

        {/* Width Label Overlay during resize */}
        {resizing && (
          <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur-sm z-20">
            {localWidth}
          </div>
        )}

        {/* Link Badge */}
        {node.attrs.href && !resizing && (
          <div className="absolute top-2 right-2 bg-google-blue text-white text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1 opacity-80">
            <LinkIcon className="w-2 h-2" /> Linked
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

// Custom Image extension to support resizing and hyperlinks
const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: '100%',
        parseHTML: element => element.getAttribute('width') || element.style.width || '100%',
        renderHTML: attributes => ({
          width: attributes.width,
          style: `width: ${attributes.width}`,
        }),
      },
      href: {
        default: null,
        parseHTML: element => element.getAttribute('href') || element.style.cursor === 'pointer' ? element.getAttribute('data-href') : null,
        renderHTML: attributes => {
          if (!attributes.href) return {};
          return {
            'data-href': attributes.href,
            'style': 'cursor: pointer'
          };
        },
      },
    }
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView)
  },
})

export const NoteEditor = ({ content, onChange, readOnly = false }: NoteEditorProps) => {
  const editor = useEditor({
    editable: !readOnly,
    extensions: [
      StarterKit,
      Underline,
      Highlight.configure({
        multicolor: true,
      }),
      ResizableImage.configure({
        allowBase64: true,
        HTMLAttributes: {
          class: 'rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm cursor-pointer hover:ring-2 hover:ring-google-blue transition-all',
        },
      }),
      Link.configure({
        openOnClick: true,
        autolink: true,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert focus:outline-none max-w-none min-h-[300px]',
      },
      handleKeyDown: (view, event) => {
        if (event.key === '>' && view.state.selection.empty) {
          const { $from } = view.state.selection;
          const prevChar = $from.parent.textContent.slice($from.parentOffset - 1, $from.parentOffset);
          if (prevChar === '-') {
            // Replace '-' with '→'
            setTimeout(() => {
              editor?.chain().focus().deleteRange({ from: $from.pos - 1, to: $from.pos }).insertContent('→').run();
            }, 0);
          }
        }
        return false;
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) return null;

  const setLink = () => {
    const { selection } = editor.state;
    const isImageSelected = editor.isActive('image');
    const { from, to } = selection;
    const isTextSelected = from !== to;
    
    if (isImageSelected) {
      const currentHref = editor.getAttributes('image').href;
      const url = window.prompt('URL for Image', currentHref || 'https://');
      if (url === null) return;
      
      if (url === '') {
        editor.chain().focus().updateAttributes('image', { href: null }).run();
      } else {
        editor.chain().focus().updateAttributes('image', { href: url }).run();
      }
      return;
    }

    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl || 'https://');

    if (url === null) return;
    
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    if (isTextSelected) {
      // If text is selected, wrap it in a link
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    } else {
      // If no text is selected, insert the link text at the cursor
      editor.chain().focus().insertContent(`<a href="${url}">${url}</a>`).run();
    }
  };

  const addImage = () => {
    const url = window.prompt('Image URL');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const resizeImage = (width: string) => {
    editor.chain().focus().updateAttributes('image', { width }).run();
  };

  return (
    <div className="flex flex-col h-full border border-gray-400 dark:border-white/20 rounded-container overflow-hidden bg-white dark:bg-gray-900 shadow-sm backdrop-blur-sm">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1 p-3 px-4 border-b border-gray-400 dark:border-white/20 bg-gray-50 dark:bg-white/5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={clsx("text-gray-600 dark:text-gray-300/80 hover:bg-gray-200 dark:hover:bg-white/20", editor.isActive('bold') && 'bg-gray-200 dark:bg-white/20 text-gray-900 dark:text-gray-300')}
          >
            <Bold className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={clsx("text-gray-600 dark:text-gray-300/80 hover:bg-gray-200 dark:hover:bg-white/20", editor.isActive('italic') && 'bg-gray-200 dark:bg-white/20 text-gray-900 dark:text-gray-300')}
          >
            <Italic className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={clsx("text-gray-600 dark:text-gray-300/80 hover:bg-gray-200 dark:hover:bg-white/20", editor.isActive('underline') && 'bg-gray-200 dark:bg-white/20 text-gray-900 dark:text-gray-300')}
          >
            <UnderlineIcon className="w-4 h-4" />
          </Button>
          <div className="w-px h-6 bg-gray-400 dark:bg-white/20 mx-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={clsx("text-gray-600 dark:text-gray-300/80 hover:bg-gray-200 dark:hover:bg-white/20", editor.isActive('bulletList') && 'bg-gray-200 dark:bg-white/20 text-gray-900 dark:text-gray-300')}
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={clsx("text-gray-600 dark:text-gray-300/80 hover:bg-gray-200 dark:hover:bg-white/20", editor.isActive('orderedList') && 'bg-gray-200 dark:bg-white/20 text-gray-900 dark:text-gray-300')}
          >
            <ListOrdered className="w-4 h-4" />
          </Button>
          <div className="w-px h-6 bg-gray-400 dark:bg-white/20 mx-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={setLink}
            className={clsx("text-gray-600 dark:text-gray-300/80 hover:bg-gray-200 dark:hover:bg-white/20", editor.isActive('link') && 'bg-gray-200 dark:bg-white/20 text-gray-900 dark:text-gray-300')}
          >
            <LinkIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={clsx("text-gray-600 dark:text-gray-300/80 hover:bg-gray-200 dark:hover:bg-white/20", editor.isActive('highlight') && 'bg-gray-200 dark:bg-white/20 text-gray-900 dark:text-gray-300')}
          >
            <Highlighter className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-600 dark:text-gray-300/80 hover:bg-gray-200 dark:hover:bg-white/20"
            onClick={() => editor.chain().focus().insertContent('→').run()}
          >
            <ArrowRight className="w-4 h-4" />
          </Button>
          <div className="w-px h-6 bg-gray-400 dark:bg-white/20 mx-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={addImage}
            className={clsx("text-gray-600 dark:text-gray-300/80 hover:bg-gray-200 dark:hover:bg-white/20", editor.isActive('image') && 'bg-gray-200 dark:bg-white/20 text-gray-900 dark:text-gray-300')}
          >
            <ImageIcon className="w-4 h-4" />
          </Button>
          {editor.isActive('image') && (
            <div className="flex items-center gap-1 ml-2">
              <span className="text-[10px] font-black uppercase text-gray-500 dark:text-gray-300/60 mr-1">Width</span>
              <button onClick={() => resizeImage('25%')} className="px-1.5 py-0.5 text-[10px] font-bold bg-gray-200 dark:bg-gray-700 rounded hover:bg-google-blue hover:text-white transition-colors">25%</button>
              <button onClick={() => resizeImage('50%')} className="px-1.5 py-0.5 text-[10px] font-bold bg-gray-200 dark:bg-gray-700 rounded hover:bg-google-blue hover:text-white transition-colors">50%</button>
              <button onClick={() => resizeImage('100%')} className="px-1.5 py-0.5 text-[10px] font-bold bg-gray-200 dark:bg-gray-700 rounded hover:bg-google-blue hover:text-white transition-colors">100%</button>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 relative custom-scrollbar">
        <EditorContent editor={editor} className="text-gray-800 dark:text-gray-300" />
      </div>
    </div>
  );
};

