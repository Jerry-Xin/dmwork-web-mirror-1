/**
 * OctoLightbox — full-screen image preview overlay.
 *
 * 受控组件：父传 src（null 则不渲染），点击 backdrop 或右上角 × 回调 onClose。
 * ESC 关闭由父组件的 handleEscKey 统一调度，不在本组件内监听。
 */

import React from "react";

interface OctoLightboxProps {
  src: string | null;
  onClose: () => void;
}

const OctoLightbox: React.FC<OctoLightboxProps> = ({ src, onClose }) => {
  if (!src) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    // 只有点到 backdrop 本身才关闭，点到图片不关
    if ((e.target as HTMLElement).classList.contains("octo-lightbox")) {
      onClose();
    }
  };

  return (
    <div className="octo-lightbox" onClick={handleBackdropClick}>
      <img src={src} alt="" />
      <button
        className="octo-lightbox-close"
        onClick={onClose}
        type="button"
      >
        ×
      </button>
    </div>
  );
};

export default OctoLightbox;
