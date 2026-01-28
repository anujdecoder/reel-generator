import Prism from 'prismjs';
import type { HighlightedToken } from '../types';

// Load only essential languages to avoid dependency conflicts
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';

// Common file extensions and their languages
const LANGUAGE_EXTENSIONS: Record<string, string> = {
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.py': 'python',
  '.java': 'java',
  '.cpp': 'cpp',
  '.c': 'c',
  '.cs': 'csharp',
  '.go': 'go',
  '.rs': 'rust',
  '.php': 'php',
  '.rb': 'ruby',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.scala': 'scala',
  '.sql': 'sql',
  '.json': 'json',
  '.xml': 'xml',
  '.html': 'html',
  '.css': 'css',
  '.scss': 'sass',
  '.less': 'less',
  '.sh': 'bash',
  '.bash': 'bash',
  '.ps1': 'powershell',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.md': 'markdown',
};



// Detect if text is code and what language
export const detectCode = (text: string): { isCode: boolean; language?: string } => {
  // Check for code blocks (```language)
  const codeBlockMatch = text.match(/^```(\w+)?\n([\s\S]*?)\n```$/m);
  if (codeBlockMatch) {
    const language = codeBlockMatch[1] || 'text';
    return { isCode: true, language };
  }

  // Check for common code patterns
  const lines = text.split('\n');
  if (lines.length < 2) return { isCode: false };

  // Check for file extension in first line (like // file.js)
  const firstLine = lines[0].trim();
  const extensionMatch = firstLine.match(/\/\/\s*(\w+\.\w+)$/);
  if (extensionMatch) {
    const ext = '.' + extensionMatch[1].split('.').pop();
    const language = LANGUAGE_EXTENSIONS[ext];
    if (language) {
      return { isCode: true, language };
    }
  }

  // Check for shebang
  if (firstLine.startsWith('#!')) {
    if (firstLine.includes('python')) return { isCode: true, language: 'python' };
    if (firstLine.includes('bash') || firstLine.includes('sh')) return { isCode: true, language: 'bash' };
    if (firstLine.includes('node')) return { isCode: true, language: 'javascript' };
  }

  // Check for common keywords
  const keywords = ['function', 'const', 'let', 'var', 'if', 'for', 'while', 'class', 'def'];
  const keywordCount = keywords.reduce((count, keyword) => {
    return count + (text.includes(keyword) ? 1 : 0);
  }, 0);

  if (keywordCount >= 2 && lines.length > 3) {
    // Try to detect language from content
    if (text.includes('import') && text.includes('from')) return { isCode: true, language: 'python' };
    if (text.includes('function') && text.includes('{')) return { isCode: true, language: 'javascript' };
    if (text.includes('interface') || text.includes(': string') || text.includes(': number')) return { isCode: true, language: 'typescript' };

    // Default to javascript if we have keywords
    return { isCode: true, language: 'javascript' };
  }

  return { isCode: false };
};

// Highlight code and return tokens with colors for canvas rendering
export const highlightCode = (code: string, language: string): HighlightedToken[] => {
  // Remove code block markers if present
  code = code.replace(/^```(\w+)?\n/, '').replace(/\n```$/, '');

  try {
    // Split code into lines to preserve formatting
    const lines = code.split('\n');
    const allTokens: HighlightedToken[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.length === 0) {
        // Empty line - add a newline token
        allTokens.push({ text: '', color: '#ffffff' });
      } else {
        // Highlight this line
        const grammar = Prism.languages[language] || Prism.languages.javascript;
        const highlighted = Prism.highlight(line, grammar, language);

        // Parse the HTML output to extract tokens
        const parser = new DOMParser();
        const doc = parser.parseFromString(`<code>${highlighted}</code>`, 'text/html');
        const codeElement = doc.querySelector('code');

        if (codeElement) {
          const walk = (node: Node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              const text = node.textContent || '';
              if (text) {
                allTokens.push({
                  text,
                  color: '#ffffff', // default color
                });
              }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              const className = element.className || '';
              let color = '#ffffff';
              let isBold = false;
              let isItalic = false;

              // Map Prism classes to colors
              if (className.includes('token keyword')) color = '#569cd6';
              else if (className.includes('token string')) color = '#ce9178';
              else if (className.includes('token comment')) color = '#6a9955';
              else if (className.includes('token number')) color = '#b5cea8';
              else if (className.includes('token function')) color = '#dcdcaa';
              else if (className.includes('token operator')) color = '#d4d4d4';
              else if (className.includes('token punctuation')) color = '#d4d4d4';
              else if (className.includes('token class-name')) color = '#4ec9b0';
              else if (className.includes('token builtin')) color = '#4ec9b0';
              else if (className.includes('token property')) color = '#9cdcfe';
              else if (className.includes('token variable')) color = '#9cdcfe';

              // Handle font styles
              if (className.includes('token bold')) isBold = true;
              if (className.includes('token italic')) isItalic = true;

              // Process child nodes
              for (const child of element.childNodes) {
                if (child.nodeType === Node.TEXT_NODE) {
                  const text = child.textContent || '';
                  if (text) {
                    allTokens.push({
                      text,
                      color,
                      isBold,
                      isItalic,
                    });
                  }
                } else if (child.nodeType === Node.ELEMENT_NODE) {
                  walk(child);
                }
              }
            }
          };

          for (const child of codeElement.childNodes) {
            walk(child);
          }
        } else {
          // Fallback for this line
          allTokens.push({ text: line, color: '#ffffff' });
        }
      }

      // Add newline marker (except for the last line)
      if (i < lines.length - 1) {
        allTokens.push({ text: '\n', color: '#ffffff', isNewline: true });
      }
    }

    return allTokens;
  } catch (error) {
    console.warn('Syntax highlighting failed:', error);
    // Fallback to plain text with preserved lines
    return code.split('\n').flatMap((line, index, arr) => {
      const tokens: HighlightedToken[] = [{ text: line, color: '#ffffff' }];
      if (index < arr.length - 1) {
        tokens.push({ text: '\n', color: '#ffffff', isNewline: true });
      }
      return tokens;
    });
  }
};