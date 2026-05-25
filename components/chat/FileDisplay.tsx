'use client';

// 채팅 파일 표시 — Storage path 를 실시간 서명 URL로 변환하여 렌더링 (M-2 fix) S
import { useState, useEffect, useRef } from 'react';
import { Paperclip } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/utils/cn';

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif'];
const isImg = (name: string) => IMAGE_EXTS.some(ext => name.toLowerCase().endsWith('.' + ext));

export default function FileDisplay({
  filePath,
  fileName,
  compact = false,
}: {
  filePath: string;
  fileName: string | null;
  compact?: boolean;
}) {
  const supabase = useRef(createClient()).current;
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (filePath.startsWith('http')) {
      // 레거시 공개/서명 URL — 그대로 사용 S
      setUrl(filePath);
    } else {
      // Storage 경로 → 1시간짜리 서명 URL 생성 S
      supabase.storage
        .from('chat-files')
        .createSignedUrl(filePath, 3600)
        .then(({ data }) => { if (data) setUrl(data.signedUrl); });
    }
  }, [filePath, supabase]);

  if (!url) return <span className="text-xs text-gray-400">파일 불러오는 중...</span>;

  if (isImg(fileName ?? '')) {
    return (
      <img
        src={url}
        alt={fileName ?? '이미지'}
        className={cn(
          'rounded-xl object-contain bg-gray-100 dark:bg-dark-surface',
          compact ? 'max-w-[200px] max-h-[120px]' : 'max-w-xs max-h-64'
        )}
      />
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-dark-surface rounded-xl text-red-primary dark:text-yellow-primary hover:underline',
        compact ? 'max-w-[200px] text-xs' : 'max-w-xs text-sm'
      )}
    >
      <Paperclip size={compact ? 11 : 13} />
      <span className="truncate">{fileName ?? '파일'}</span>
    </a>
  );
}
