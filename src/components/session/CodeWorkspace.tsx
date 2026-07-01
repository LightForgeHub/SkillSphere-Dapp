import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Copy, Check, Code2 } from 'lucide-react';

interface CodeWorkspaceProps {
  onClose?: () => void;
}

const LANGUAGES = [
  { id: 'javascript', name: 'JavaScript' },
  { id: 'typescript', name: 'TypeScript' },
  { id: 'rust', name: 'Rust' },
  { id: 'python', name: 'Python' },
];

export const CodeWorkspace: React.FC<CodeWorkspaceProps> = ({ onClose }) => {
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('// Write your code here...');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-card rounded-lg overflow-hidden border border-white/10">
      <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Code2 className="size-4 text-white/50" />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-transparent text-sm text-white/80 focus:outline-none cursor-pointer"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.id} value={lang.id} className="bg-card">
                {lang.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-white/60 hover:text-white"
            title="Copy code"
          >
            {copied ? <Check className="size-4 text-green-400" /> : <Copy className="size-4" />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-xs text-white/50 hover:text-white px-2 py-1 rounded hover:bg-white/10 ml-2"
            >
              Close
            </button>
          )}
        </div>
      </div>
      
      <div className="flex-1">
        <Editor
          height="100%"
          language={language}
          theme="vs-dark"
          value={code}
          onChange={(value) => setCode(value || '')}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: 'on',
            scrollBeyondLastLine: false,
          }}
        />
      </div>
    </div>
  );
};
