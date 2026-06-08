import React, { useEffect, useState } from 'react';
import { api } from '../../../src/api';

export default function AutomationDashboard() {
  const [workflows, setWorkflows] = useState([]);

  useEffect(() => {
    async function load() {
      const res = await api.get('/api/workflows');
      if (res?.data) setWorkflows(res.data);
    }
    load();
  }, []);

  return (
    <div>
      <h2>Automation</h2>
      <p>Workflows</p>
      <div>
        {workflows.length ? (
          <ul>{workflows.map(w => <li key={w.id}>{w.name} — {w.status}</li>)}</ul>
        ) : <p>No workflows yet</p>}
      </div>
    </div>
  );
}
