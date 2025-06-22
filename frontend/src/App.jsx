import React, { useEffect, useState, useCallback } from "react";
import io from "socket.io-client";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");
const socket = io(API_URL);

const mockUsers = {
  netrunnerX: { id: 'netrunnerX', role: 'admin', name: 'Admin User' },
  citizen1: { id: 'citizen1', role: 'contributor', name: 'Citizen Reporter' },
  guestViewer: { id: 'guestViewer', role: 'viewer', name: 'Guest Viewer' },
};

export default function App() {
  const [disasters, setDisasters] = useState([]);
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('reports');
  const [form, setForm] = useState({ title: "", description: "", tags: "" });
  const [reports, setReports] = useState([]);
  const [resources, setResources] = useState([]);
  const [social, setSocial] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [geocode, setGeocode] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [verifyResult, setVerifyResult] = useState(null);
  const [loading, setLoading] = useState({ disasters: true });
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(mockUsers.netrunnerX);

  const fetchDisasters = useCallback(async () => {
    setLoading(l => ({ ...l, disasters: true }));
    setError("");
    try {
      const res = await fetch(`${API_URL}/disasters`);
      if (!res.ok) throw new Error("Failed to fetch disasters");
      setDisasters(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(l => ({ ...l, disasters: false }));
    }
  }, []);
  
  const handleFormChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  useEffect(() => {
    fetchDisasters();
    socket.on("disaster_updated", fetchDisasters);
    socket.on("resources_updated", ({ data, disaster_id }) => {
      if (selected?.id === disaster_id) setResources(data);
    });
    socket.on("social_media_updated", ({ data, disaster_id }) => {
      if (selected?.id === disaster_id) setSocial(data);
    });
    return () => {
      socket.off("disaster_updated");
      socket.off("resources_updated");
      socket.off("social_media_updated");
    };
  }, [fetchDisasters, selected]);

  const selectDisaster = async (d) => {
    if (selected?.id === d.id) {
      setSelected(null); return;
    }
    setSelected(d); 
    setActiveTab('reports');
    setLoading(l => ({ ...l, details: true }));
    setError("");
    setReports([]); setSocial([]); setUpdates([]); setResources([]); setGeocode(null); setVerifyResult(null); setImageUrl("");
    try {
      const checkResponse = (res) => { if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`); return res.json(); };
      const [r, s, u] = await Promise.all([
        fetch(`${API_URL}/disasters/${d.id}/reports`).then(checkResponse),
        fetch(`${API_URL}/disasters/${d.id}/social-media`).then(checkResponse),
        fetch(`${API_URL}/disasters/${d.id}/official-updates`).then(checkResponse)
      ]);
      setReports(r); setSocial(s); setUpdates(u);
    } catch (err) {
      setError(`Failed to fetch disaster details: ${err.message}`);
    } finally {
      setLoading(l => ({ ...l, details: false }));
    }
  };

  const submitDisaster = async (e) => {
    e.preventDefault();
    setLoading(l => ({ ...l, form: true })); setError("");
    try {
      const method = form.id ? "PUT" : "POST";
      const url = form.id ? `${API_URL}/disasters/${form.id}` : `${API_URL}/disasters`;
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json", "x-user-id": currentUser.id },
        body: JSON.stringify({ ...form, tags: form.tags.split(",").map(t => t.trim()) })
      });
      if (!res.ok) throw new Error("Failed to save disaster");
      setForm({ title: "", description: "", tags: "" });
      await fetchDisasters();
    } catch (err) { setError(err.message); } finally { setLoading(l => ({ ...l, form: false })); }
  };
  
  const handleEditClick = (disaster) => setForm({ ...disaster, tags: disaster.tags.join(", ") });

  const deleteDisaster = async (id) => {
    setLoading(l => ({ ...l, [`delete_${id}`]: true })); setError("");
    try {
      const res = await fetch(`${API_URL}/disasters/${id}`, { method: "DELETE", headers: { "x-user-id": currentUser.id } });
      if (!res.ok) throw new Error("Failed to delete disaster");
      setSelected(null);
      await fetchDisasters();
    } catch (err) { setError(err.message); } finally { setLoading(l => ({ ...l, [`delete_${id}`]: false })); }
  };

  const doGeocode = async () => {
    if (!selected?.description) return; setLoading(true); setError("");
    try {
      const res = await fetch(`${API_URL}/geocode`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description: selected.description }) });
      if (!res.ok) throw new Error("Geocoding failed");
      setGeocode(await res.json());
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };
  
  const submitReport = async (e) => {
    e.preventDefault(); if (!selected) return; setLoading(true); setError("");
    try {
      const res = await fetch(`${API_URL}/disasters/${selected.id}/reports`, {
        method: "POST", headers: { "Content-Type": "application/json", "x-user-id": currentUser.id },
        body: JSON.stringify({ content: e.target.content.value, image_url: e.target.image_url.value })
      });
      if (!res.ok) throw new Error("Failed to submit report");
      const newReport = await res.json();
      setReports(prev => [newReport, ...prev]);
      e.target.reset();
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const verifyImage = async () => {
    if (!selected || !imageUrl) return; setLoading(true); setError("");
    try {
      const res = await fetch(`${API_URL}/disasters/${selected.id}/verify-image`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image_url: imageUrl })
      });
      if (!res.ok) throw new Error("Image verification failed");
      setVerifyResult(await res.json());
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };
  
  const fetchNearbyResources = async (lat, lon) => {
    if (!selected) return; setLoading(true); setError("");
    try {
      const res = await fetch(`${API_URL}/disasters/${selected.id}/resources?lat=${lat}&lon=${lon}`);
      if (!res.ok) throw new Error("Failed to fetch resources");
      setResources(await res.json());
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-200 font-sans">
      <header className="flex-shrink-0 bg-gray-800 border-b border-gray-700">
        <div className="h-16 flex items-center justify-between px-6">
          <h1 className="text-lg font-bold text-white">Disaster Response Platform</h1>
          <div className="flex items-center gap-3">
            <label htmlFor="user" className="text-sm font-medium text-gray-400">Acting as:</label>
            <select id="user" value={currentUser.id} onChange={e => { setSelected(null); setCurrentUser(mockUsers[e.target.value]); }}
              className="px-3 py-1.5 text-sm font-semibold border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-gray-700 text-white">
              {Object.values(mockUsers).map(user => <option key={user.id} value={user.id}>{user.name} ({user.role})</option>)}
            </select>
          </div>
        </div>
      </header>
      
      <main className="flex-grow flex gap-6 p-6 overflow-hidden">
        <aside className="w-[380px] flex-shrink-0 flex flex-col gap-6 overflow-y-auto">
          {(currentUser.role === 'admin') && (
            <div className="bg-gray-800 rounded-lg border border-gray-700">
              <h3 className="px-5 py-3 text-sm font-semibold text-gray-300 border-b border-gray-700">{form.id ? "Update Disaster" : "Create Disaster"}</h3>
              <form onSubmit={submitDisaster} className="p-5 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="title" className="text-xs font-medium text-gray-400">Title</label>
                  <input id="title" value={form.title} onChange={handleFormChange} required className="w-full px-3 py-2 text-sm border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-gray-700 text-white placeholder-gray-400"/>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="description" className="text-xs font-medium text-gray-400">Description</label>
                  <textarea id="description" value={form.description} onChange={handleFormChange} required className="w-full px-3 py-2 text-sm border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none h-24 resize-none bg-gray-700 text-white placeholder-gray-400"/>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="tags" className="text-xs font-medium text-gray-400">Tags</label>
                  <input id="tags" value={form.tags} onChange={handleFormChange} className="w-full px-3 py-2 text-sm border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-gray-700 text-white placeholder-gray-400"/>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <button type="submit" disabled={loading.form} className="w-full text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-colors px-4 py-2">
                    {loading.form ? "Saving..." : (form.id ? "Update Disaster" : "Create Disaster")}
                  </button>
                  {form.id && <button type="button" onClick={() => setForm({ title: "", description: "", tags: "" })}
                    className="w-full text-sm font-semibold text-gray-200 bg-gray-600 rounded-md hover:bg-gray-500 transition-colors px-4 py-2">Cancel</button>}
                </div>
              </form>
            </div>
          )}
          <div className="bg-gray-800 rounded-lg border border-gray-700 flex flex-col flex-grow">
            <h3 className="px-5 py-3 text-sm font-semibold text-gray-300 border-b border-gray-700 flex items-center justify-between">
              <span>Disasters</span>
              {loading.disasters && <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>}
            </h3>
            <ul className="flex-grow overflow-y-auto">
              {disasters.map(d => (
                <li key={d.id} onClick={() => selectDisaster(d)}
                  className={`flex items-center justify-between px-5 py-3 border-b border-gray-700 cursor-pointer transition-colors ${selected?.id === d.id ? 'bg-indigo-600 text-white' : 'hover:bg-gray-700'}`}>
                  <span className="font-semibold text-sm">{d.title}</span>
                  {currentUser.role === 'admin' && (
                    <div className="flex items-center">
                      <button title="Edit" onClick={(e) => { e.stopPropagation(); handleEditClick(d); }} className="p-2 rounded-md hover:bg-white/10"><PencilIcon /></button>
                      <button title="Delete" onClick={(e) => { e.stopPropagation(); deleteDisaster(d.id); }} disabled={loading[`delete_${d.id}`]} className="p-2 rounded-md hover:bg-white/10 disabled:opacity-50">
                        {loading[`delete_${d.id}`] ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div> : <TrashIcon />}
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <section className="flex-grow overflow-y-auto">
          {loading.details ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-800 rounded-lg border border-gray-700">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : !selected ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800 rounded-lg border border-gray-700 text-center">
              <div className="text-5xl text-gray-600 mb-4">🗺️</div>
              <h2 className="text-lg font-semibold text-gray-300">Select a disaster to view details</h2>
              <p className="text-sm text-gray-500">You are currently acting as a {currentUser.role}.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <div className="flex items-start justify-between">
                    <h2 className="text-2xl font-bold text-white">{selected.title}</h2>
                    <div className="flex items-center gap-2">
                      {selected.tags?.map(t => <span key={t} className="px-2.5 py-0.5 text-xs font-semibold text-indigo-100 bg-indigo-500/50 rounded-full">{t}</span>)}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-gray-400">{selected.description}</p>
              </div>
              
              <div className="flex items-center border-b border-gray-700">
                <TabButton name="reports" activeTab={activeTab} setActiveTab={setActiveTab}>Reports</TabButton>
                <TabButton name="social" activeTab={activeTab} setActiveTab={setActiveTab}>Social Media</TabButton>
                <TabButton name="updates" activeTab={activeTab} setActiveTab={setActiveTab}>Official Updates</TabButton>
                {currentUser.role === 'admin' && <TabButton name="tools" activeTab={activeTab} setActiveTab={setActiveTab}>Admin Tools</TabButton>}
              </div>

              <div className="bg-gray-800 rounded-lg border border-gray-700">
                <div className="p-6">
                  {activeTab === 'reports' && (
                    <ul className="flex flex-col gap-3">
                      {currentUser.role !== 'viewer' && 
                        <li className="mb-4">
                          <form className="flex flex-col gap-2" onSubmit={submitReport}>
                            <textarea name="content" placeholder="Submit a new report..." required className="w-full px-3 py-2 text-sm border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none h-20 resize-none bg-gray-700 text-white placeholder-gray-400"/>
                            <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors self-start">Submit Report</button>
                          </form>
                        </li>
                      }
                      {reports.length > 0 ? reports.map(r => <li key={r.id} className="text-sm bg-gray-900 p-3 rounded-md border border-gray-700 text-gray-300">{r.content}</li>) : <li className="text-sm text-gray-500">No reports yet.</li>}
                    </ul>
                  )}
                  {activeTab === 'social' && (
                     <ul className="flex flex-col gap-3">
                      {social.length > 0 ? social.map((s, i) => <li key={i} className="text-sm bg-gray-900 p-3 rounded-md border border-gray-700 text-gray-300">{s.post}</li>) : <li className="text-sm text-gray-500">No social media posts.</li>}
                    </ul>
                  )}
                  {activeTab === 'updates' && (
                    <ul className="flex flex-col gap-3">
                      {updates.length > 0 ? updates.map((u, i) => <li key={i} className="text-sm flex items-center justify-between bg-gray-900 p-3 rounded-md border border-gray-700"><a href={u.link} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline font-medium">{u.title}</a> <span className="text-xs text-gray-500">{new Date(u.pubDate).toLocaleDateString()}</span></li>) : <li className="text-sm text-gray-500">No official updates.</li>}
                    </ul>
                  )}
                  {activeTab === 'tools' && currentUser.role === 'admin' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-2">
                        <h4 className="font-semibold text-sm text-gray-300">Geospatial Tools</h4>
                        <button onClick={doGeocode} disabled={!!geocode} className="px-4 py-2 text-sm font-semibold text-white bg-gray-600 rounded-md hover:bg-gray-500 disabled:bg-gray-400/50 disabled:cursor-not-allowed transition-colors">Geocode Location</button>
                        <button onClick={() => fetchNearbyResources(geocode?.lat, geocode?.lon)} disabled={!geocode} className="px-4 py-2 text-sm font-semibold text-white bg-gray-600 rounded-md hover:bg-gray-500 disabled:bg-gray-400/50 disabled:cursor-not-allowed transition-colors">Find Resources</button>
                        {resources.length > 0 && <ul className="text-sm mt-2">{resources.map(r => <li key={r.id}>{r.name}</li>)}</ul>}
                      </div>
                      <div className="flex flex-col gap-2">
                        <h4 className="font-semibold text-sm text-gray-300">Verify Image</h4>
                         <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="Image URL to verify" className="w-full px-3 py-2 text-sm border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-gray-700 text-white placeholder-gray-400"/>
                        <button onClick={verifyImage} className="px-4 py-2 text-sm font-semibold text-white bg-gray-600 rounded-md hover:bg-gray-500 transition-colors">Verify Image</button>
                        {verifyResult && <p className="text-xs mt-2"><b>Status:</b> {verifyResult.status}</p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
      {error && <div onClick={() => setError("")} className="fixed bottom-6 right-6 flex items-center gap-4 px-5 py-3 rounded-lg bg-red-600 text-white shadow-lg cursor-pointer animate-pulse"><span className="font-semibold">{error}</span><button className="text-2xl">&times;</button></div>}
    </div>
  );
}

function TabButton({ name, activeTab, setActiveTab, children }) {
  const isActive = activeTab === name;
  return (
    <button onClick={() => setActiveTab(name)} 
      className={`px-4 py-2 text-sm font-semibold transition-colors ${isActive ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-gray-200'}`}>
      {children}
    </button>
  );
}

function PencilIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
      <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  );
}
