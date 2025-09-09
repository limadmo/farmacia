/**
 * Componente para renderização segura de HTML
 * 
 * Previne XSS sanitizando conteúdo HTML antes da renderização
 */

import React from 'react';
import DOMPurify from 'isomorphic-dompurify';

interface SafeHTMLProps {
  html: string;
  className?: string;
  allowedTags?: string[];
  allowedAttributes?: string[];
  tag?: keyof JSX.IntrinsicElements;
}

/**
 * Configurações de sanitização por contexto
 */
const sanitizeConfigs = {
  // Para conteúdo geral (mais restritivo)
  default: {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['class', 'id'],
    KEEP_CONTENT: true
  },
  
  // Para comentários/descrições (muito restritivo)
  text: {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  },
  
  // Para conteúdo rico (menos restritivo, mas ainda seguro)
  rich: {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'table', 'thead', 'tbody',
      'tr', 'td', 'th'
    ],
    ALLOWED_ATTR: ['class', 'id'],
    KEEP_CONTENT: true
  }
};

/**
 * Componente para renderização segura de HTML
 */
const SafeHTML: React.FC<SafeHTMLProps> = ({
  html,
  className = '',
  allowedTags,
  allowedAttributes,
  tag: Tag = 'div'
}) => {
  // Configuração de sanitização
  const config = {
    ...sanitizeConfigs.default,
    ...(allowedTags && { ALLOWED_TAGS: allowedTags }),
    ...(allowedAttributes && { ALLOWED_ATTR: allowedAttributes })
  };
  
  // Sanitizar HTML
  const sanitizedHTML = DOMPurify.sanitize(html, config);
  
  return (
    <Tag
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
    />
  );
};

/**
 * Componente específico para texto puro (remove todo HTML)
 */
export const SafeText: React.FC<{
  text: string;
  className?: string;
  tag?: keyof JSX.IntrinsicElements;
}> = ({ text, className = '', tag: Tag = 'span' }) => {
  const sanitizedText = DOMPurify.sanitize(text, sanitizeConfigs.text);
  
  return (
    <Tag className={className}>
      {sanitizedText}
    </Tag>
  );
};

/**
 * Componente para conteúdo rico com formatação
 */
export const SafeRichContent: React.FC<{
  content: string;
  className?: string;
}> = ({ content, className = '' }) => {
  const sanitizedContent = DOMPurify.sanitize(content, sanitizeConfigs.rich);
  
  return (
    <div
      className={`rich-content ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
};

/**
 * Hook para sanitização de strings
 */
export const useSanitize = () => {
  return {
    sanitizeHTML: (html: string, config?: any) => 
      DOMPurify.sanitize(html, config || sanitizeConfigs.default),
    
    sanitizeText: (text: string) => 
      DOMPurify.sanitize(text, sanitizeConfigs.text),
    
    sanitizeRich: (content: string) => 
      DOMPurify.sanitize(content, sanitizeConfigs.rich),
    
    // Escapar caracteres especiais
    escapeHTML: (text: string) => 
      text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;'),
        
    // Validar se string contém HTML suspeito
    hasUnsafeContent: (text: string) => {
      const suspiciousPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /vbscript:/gi,
        /on\w+\s*=/gi,
        /<iframe/gi,
        /<object/gi,
        /<embed/gi,
        /expression\(/gi,
        /eval\(/gi
      ];
      
      return suspiciousPatterns.some(pattern => pattern.test(text));
    }
  };
};

/**
 * Componente de validação que alerta sobre conteúdo perigoso
 */
export const ContentValidator: React.FC<{
  content: string;
  children: React.ReactNode;
  onUnsafeContent?: () => void;
}> = ({ content, children, onUnsafeContent }) => {
  const { hasUnsafeContent } = useSanitize();
  
  React.useEffect(() => {
    if (hasUnsafeContent(content)) {
      console.warn('Conteúdo potencialmente perigoso detectado:', content);
      onUnsafeContent?.();
    }
  }, [content, hasUnsafeContent, onUnsafeContent]);
  
  return <>{children}</>;
};

export default SafeHTML;