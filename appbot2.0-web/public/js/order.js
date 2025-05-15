document.addEventListener('DOMContentLoaded', () => {
    const sortable = document.getElementById('sortable-list');
    const saveBtn = document.getElementById('save-order');
  
    let dragging;
  
    sortable.addEventListener('dragstart', (e) => {
      dragging = e.target;
      e.dataTransfer.effectAllowed = 'move';
    });
  
    sortable.addEventListener('dragover', (e) => {
      e.preventDefault();
      const target = e.target.closest('li');
      if (target && target !== dragging) {
        const rect = target.getBoundingClientRect();
        const next = (e.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
        sortable.insertBefore(dragging, next ? target.nextSibling : target);
      }
    });
  
    saveBtn.addEventListener('click', async () => {
      const ids = [...sortable.querySelectorAll('li')].map((li, index) => ({
        id: li.dataset.id,
        position: index + 1
      }));
  
      const res = await fetch('/dashboard/reorder-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: ids })
      });
  
      if (res.ok) alert('✅ Order saved!');
      else alert('❌ Failed to save order.');
    });
  
    [...sortable.children].forEach(li => {
      li.setAttribute('draggable', true);
    });
  });
  