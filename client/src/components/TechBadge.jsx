const TECH_CONFIG = {
  javascript: { label: 'JavaScript', className: 'badge-js', icon: '⚡' },
  php: { label: 'PHP', className: 'badge-php', icon: '🐘' },
  cpp: { label: 'C++', className: 'badge-cpp', icon: '⚙️' },
  csharp: { label: 'C#', className: 'badge-csharp', icon: '🎮' },
  mobile: { label: 'Mobile', className: 'badge-mobile', icon: '📱' },
};

export default function TechBadge({ technology, size = 'sm' }) {
  const config = TECH_CONFIG[technology] || { label: technology, className: 'badge', icon: '?' };
  const sizeClass = size === 'lg' ? 'text-sm px-3 py-1' : '';
  return (
    <span className={`${config.className} ${sizeClass}`}>
      {config.icon} {config.label}
    </span>
  );
}
