import { useEffect, useState } from 'react';
import { Droppable } from 'react-beautiful-dnd';

export default function StrictModeDroppable({ children, ...props }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => cancelAnimationFrame(animation);
  }, []);

  if (!enabled) return null;

  return <Droppable {...props}>{children}</Droppable>;
}
