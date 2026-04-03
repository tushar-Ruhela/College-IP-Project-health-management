import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { 
  Video, 
  Users, 
  Stethoscope, 
  Heart, 
  Calendar,
  Plus,
  LogIn,
  Link,
  Activity
} from 'lucide-react';


export default function LandingPage() {
  const [roomInput, setRoomInput] = useState('');
  const navigate = useNavigate();

  // Create room handler
  const handleCreateRoom = () => {
    const newRoomId = nanoid(6);
    navigate(`/room/${newRoomId}`);
  };

  // Join existing room
  const handleJoinRoom = () => {
    let roomId = roomInput.trim();
    if (roomId.includes('/room/')) {
      const parts = roomId.split('/room/');
      roomId = parts[1];
    }

    if (!roomId) {
      alert('Please enter a valid Room ID or link');
      return;
    }

    navigate(`/room/${roomId}`);
  };

  // Features cards info
  const features = [
    { icon: Video, title: "HD Video Consultations", description: "Crystal clear video quality for effective remote consultations" },
    { icon: Heart, title: "Digital Prescriptions", description: "Send electronic prescriptions directly to pharmacies" },
    { icon: Users, title: "Multi-participant Rooms", description: "Support for multiple participants in consultation rooms" },
    { icon: Activity, title: "Real-time Monitoring", description: "Live session monitoring and health data tracking" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Stethoscope size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Nirogya
              </h1>
              <p className="text-xs text-gray-500 font-medium">Telemedicine Platform</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Live & Secure
          </div>
        </div>
      </header>

      {/* Main Section */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Hero */}
          <div className="space-y-8">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-semibold">
                <Heart size={16} /> Healthcare Made Simple
              </div>
              <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Connect with 
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Healthcare
                </span>
                {' '}Professionals
              </h1>
              <p className="text-xl text-gray-600">
                Secure, professional telemedicine platform for virtual healthcare consultations and medical services.
              </p>
            </div>


            {/* Actions */}
            <div className="space-y-6 mt-8">
              <button
                onClick={handleCreateRoom}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-4 rounded-2xl text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                <Plus size={24} />
                Start New Room
              </button>

              <div className="flex items-center gap-4">
                <div className="h-px bg-gray-300 flex-1" />
                <span className="text-gray-500 font-medium">or</span>
                <div className="h-px bg-gray-300 flex-1" />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Link size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={roomInput}
                    onChange={(e) => setRoomInput(e.target.value)}
                    placeholder="Enter Room ID or Link"
                    className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-200 rounded-2xl text-lg focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                    onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                  />
                </div>
                <button
                  onClick={handleJoinRoom}
                  className="inline-flex items-center justify-center gap-2 bg-white border-2 border-gray-200 hover:border-blue-500 text-gray-700 hover:text-blue-600 px-6 py-4 rounded-2xl text-lg font-semibold transition-all hover:bg-blue-50"
                >
                  <LogIn size={20} />
                  Join Room
                </button>
              </div>
            </div>
          </div>

          {/* Right - Info Cards */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                  <Calendar size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Quick Guide</h3>
                  <p className="text-gray-600">Get Started Fast</p>
                </div>
              </div>
              <ul className="space-y-2 text-gray-700">
                <li>1️⃣ Click "Start New Room" to create a session</li>
                <li>2️⃣ Share the room link with participants</li>
                <li>3️⃣ Begin your secure video consultation</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {features.map((f, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition duration-300 hover:scale-105"
                >
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                    <f.icon size={20} className="text-white" />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">{f.title}</h4>
                  <p className="text-sm text-gray-600">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-20 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Stethoscope size={16} className="text-white" />
            </div>
            <span className="text-gray-600 text-sm">© 2025 Nirogya Telemedicine Platform</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <a href="#" className="hover:text-blue-600">Privacy Policy</a>
            <a href="#" className="hover:text-blue-600">Terms of Service</a>
            <a href="#" className="hover:text-blue-600">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
