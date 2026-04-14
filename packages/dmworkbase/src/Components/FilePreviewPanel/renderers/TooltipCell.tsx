import React, { useRef, useState, useEffect } from "react";
import "./TooltipCell.css";

interface TooltipCellProps {
  content: React.ReactNode;
}

/**
 * 单元格 Tooltip 组件
 * 当内容被截断时，hover 显示完整内容
 */
export function TooltipCell({ content }: TooltipCellProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const checkTruncation = () => {
      if (ref.current) {
        setIsTruncated(ref.current.scrollWidth > ref.current.clientWidth);
      }
    };

    checkTruncation();
    window.addEventListener("resize", checkTruncation);
    return () => window.removeEventListener("resize", checkTruncation);
  }, [content]);

  if (!isTruncated) {
    return (
      <div ref={ref} className="wk-excel-tooltip-cell">
        {content}
      </div>
    );
  }

  return (
    <div className="wk-excel-tooltip-cell__wrapper">
      <div ref={ref} className="wk-excel-tooltip-cell">
        {content}
      </div>
      <div className="wk-excel-tooltip-cell__popup">{content}</div>
    </div>
  );
}
