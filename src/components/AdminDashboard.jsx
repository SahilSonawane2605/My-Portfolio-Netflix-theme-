import React, { useState, useEffect } from 'react';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { auth, db } from '../firebase';
import CustomCursor from './CustomCursor';

const AdminDashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inquiries, setInquiries] = useState([]);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        fetchInquiries();
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchInquiries = async () => {
    try {
      const q = query(collection(db, 'inquiries'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInquiries(data);
    } catch (err) {
      console.error("Error fetching inquiries:", err);
      setError("Failed to fetch inquiries. Check Firebase config/rules.");
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError('Invalid email or password.');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, 'inquiries', id), { status: newStatus });
      setInquiries(inquiries.map(inq => inq.id === id ? { ...inq, status: newStatus } : inq));
      if (selectedInquiry?.id === id) {
        setSelectedInquiry({ ...selectedInquiry, status: newStatus });
      }
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Failed to update status.");
    }
  };

  if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">LOADING...</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center font-sans">
        <CustomCursor />
        <div className="max-w-md w-full bg-[#141414] p-10 rounded-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative z-10">
          <h2 className="text-3xl font-black mb-6 text-center text-red-600">ADMIN ACCESS</h2>
          {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
          <form onSubmit={handleLogin} className="flex flex-col gap-6">
            <input 
              type="email" 
              placeholder="Email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              className="bg-transparent border-b border-white/20 pb-2 text-white focus:border-red-600 outline-none"
              required 
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="bg-transparent border-b border-white/20 pb-2 text-white focus:border-red-600 outline-none"
              required 
            />
            <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded mt-4 transition-colors">
              AUTHENTICATE
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard Stats
  const total = inquiries.length;
  const newCount = inquiries.filter(i => i.status === 'New').length;
  const readCount = inquiries.filter(i => i.status === 'Read').length;
  const repliedCount = inquiries.filter(i => i.status === 'Replied').length;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans p-6 md:p-12 relative">
      <CustomCursor />
      
      <div className="max-w-7xl mx-auto space-y-10 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/10 pb-8">
          <div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-2">
              INQUIRY <span className="text-red-600">DASHBOARD</span>
            </h1>
            <p className="text-white/50 font-mono text-sm">SECURE ADMIN CONSOLE</p>
          </div>
          <button onClick={handleLogout} className="px-6 py-2 border border-white/20 rounded hover:bg-white/10 transition-colors text-sm font-bold uppercase tracking-wider">
            Logout
          </button>
        </div>

        {error && <p className="text-red-500 bg-red-500/10 p-4 rounded border border-red-500/30">{error}</p>}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'TOTAL INQUIRIES', value: total, color: 'text-white' },
            { label: 'NEW', value: newCount, color: 'text-red-500' },
            { label: 'READ', value: readCount, color: 'text-blue-400' },
            { label: 'REPLIED', value: repliedCount, color: 'text-green-500' },
          ].map((stat, idx) => (
            <div key={idx} className="bg-[#141414] p-6 rounded-xl border border-white/5 flex flex-col justify-between">
              <span className="text-xs font-mono text-white/50">{stat.label}</span>
              <span className={`text-4xl font-black ${stat.color} mt-2`}>{stat.value}</span>
            </div>
          ))}
        </div>

        {/* Inquiries List & Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* List */}
          <div className="lg:col-span-1 bg-[#141414] rounded-xl border border-white/5 overflow-hidden flex flex-col max-h-[600px]">
            <div className="p-4 border-b border-white/10 bg-[#1a1a1a]">
              <h3 className="font-bold text-lg">Inbox</h3>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-2">
              {inquiries.map(inq => (
                <div 
                  key={inq.id}
                  onClick={() => setSelectedInquiry(inq)}
                  className={`p-4 rounded-lg cursor-pointer transition-colors ${selectedInquiry?.id === inq.id ? 'bg-red-600/20 border-red-600/50' : 'bg-white/5 hover:bg-white/10'} border border-transparent`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold truncate pr-2">{inq.firstName} {inq.lastName}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase ${inq.status === 'New' ? 'bg-red-500/20 text-red-500' : inq.status === 'Replied' ? 'bg-green-500/20 text-green-500' : 'bg-blue-500/20 text-blue-400'}`}>
                      {inq.status}
                    </span>
                  </div>
                  <div className="text-xs text-white/50 truncate">{inq.email}</div>
                  <div className="text-xs text-white/40 mt-2 font-mono">
                    {new Date(inq.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
              {inquiries.length === 0 && <div className="p-4 text-center text-white/50 text-sm">No inquiries found.</div>}
            </div>
          </div>

          {/* Details */}
          <div className="lg:col-span-2 bg-[#141414] rounded-xl border border-white/5 p-6 flex flex-col min-h-[400px]">
            {selectedInquiry ? (
              <div className="space-y-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start pb-6 border-b border-white/10">
                  <div>
                    <h2 className="text-2xl font-black mb-1">{selectedInquiry.firstName} {selectedInquiry.lastName}</h2>
                    <a href={`mailto:${selectedInquiry.email}`} className="text-red-500 hover:underline">{selectedInquiry.email}</a>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-white/50 mb-2">{new Date(selectedInquiry.createdAt).toLocaleString()}</div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => updateStatus(selectedInquiry.id, 'New')} className={`px-3 py-1 text-xs rounded border ${selectedInquiry.status === 'New' ? 'border-red-500 text-red-500 bg-red-500/10' : 'border-white/20 text-white/50 hover:text-white'}`}>NEW</button>
                      <button onClick={() => updateStatus(selectedInquiry.id, 'Read')} className={`px-3 py-1 text-xs rounded border ${selectedInquiry.status === 'Read' ? 'border-blue-400 text-blue-400 bg-blue-400/10' : 'border-white/20 text-white/50 hover:text-white'}`}>READ</button>
                      <button onClick={() => updateStatus(selectedInquiry.id, 'Replied')} className={`px-3 py-1 text-xs rounded border ${selectedInquiry.status === 'Replied' ? 'border-green-500 text-green-500 bg-green-500/10' : 'border-white/20 text-white/50 hover:text-white'}`}>REPLIED</button>
                    </div>
                  </div>
                </div>
                <div className="flex-1 bg-white/5 p-6 rounded-lg whitespace-pre-wrap text-white/80 leading-relaxed">
                  {selectedInquiry.message}
                </div>
                <div className="pt-4 border-t border-white/10 text-xs text-white/40">
                  Permission to contact: {selectedInquiry.permission ? 'Granted' : 'Not Granted'}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-white/30 font-light">
                Select an inquiry to view details.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
