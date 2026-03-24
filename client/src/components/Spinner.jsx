export default function Spinner({ size = 'md', center = false }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
  const el = (
    <div
      className={`${sizes[size]} border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin`}
    />
  );
  if (center) return <div className="flex justify-center items-center py-12">{el}</div>;
  return el;
}
