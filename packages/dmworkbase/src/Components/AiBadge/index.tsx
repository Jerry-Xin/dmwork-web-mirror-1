import React from "react";
import "./index.css";

interface AiBadgeProps {
    size?: "default" | "small";
    className?: string;
}

const AiBadge: React.FC<AiBadgeProps> = ({ size = "default", className }) => {
    const sizeClass = size === "small" ? "ai-badge-small" : "ai-badge-default";
    const combinedClassName = className
        ? `ai-badge ${sizeClass} ${className}`
        : `ai-badge ${sizeClass}`;

    return <span className={combinedClassName}>AI</span>;
};

export default AiBadge;
