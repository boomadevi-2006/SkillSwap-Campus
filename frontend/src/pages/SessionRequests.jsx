import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

const statusConfig = {
  pending: { color: "bg-yellow-100 text-yellow-700", label: "Pending" },
  accepted: { color: "bg-green-100 text-green-700", label: "Accepted" },
  rescheduled: { color: "bg-blue-100 text-blue-700", label: "Rescheduled" },
  completed: { color: "bg-gray-100 text-gray-700", label: "Completed" },
};

export default function SessionRequests() {
  const [sessions, setSessions] = useState({ asLearner: [], asMentor: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/api/sessions/my")
      .then((r) => setSessions(r.data))
      .catch(() => setSessions({ asLearner: [], asMentor: [] }))
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (sessionId, status) => {
    try {
      await api.patch("/api/sessions/" + sessionId, { status });
      const r = await api.get("/api/sessions/my");
      setSessions(r.data);
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  function SessionCard({ s, asMentor }) {
    const other = asMentor ? s.learnerId : s.mentorId;
    const skill = s.skillId;
    const canAccept = asMentor && s.status === "pending";
    const canComplete = asMentor && (s.status === "accepted" || s.status === "rescheduled");
    const canChat = ["accepted", "rescheduled", "completed"].includes(s.status);
    const config = statusConfig[s.status] || statusConfig.pending;

    return (
      <div className="card-elevated mb-4">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-xl ${config.color} flex items-center justify-center text-xl`}
            >
              {config.label[0]}
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-lg">{skill?.title}</h3>
              <p className="text-gray-500 text-sm">{skill?.category}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <span>
                  {asMentor ? "Teaching" : "Learning from"}: <strong>{other?.name}</strong>
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                <span>{new Date(s.date).toLocaleDateString()}</span>
                <span>{s.timeSlot}</span>
                <span>{s.teachingMode}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={`badge ${config.color}`}>{config.label}</span>

            {canAccept && (
              <button
                onClick={() => updateStatus(s._id, "accepted")}
                className="btn-primary text-sm"
              >
                Accept
              </button>
            )}

            {canComplete && (
              <button
                onClick={() => updateStatus(s._id, "completed")}
                className="btn-primary text-sm"
              >
                Mark Complete
              </button>
            )}

            {canChat && (
              <Link to={"/chat/" + s._id} className="btn-secondary text-sm">
                Chat
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="mb-6">
          <h1 className="section-title">Sessions</h1>
          <p className="section-subtitle">Manage your learning and teaching sessions</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card animate-pulse h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="section-title">Sessions</h1>
        <p className="section-subtitle">Track your learning and teaching sessions</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* As Learner */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-bold text-gray-800">As Learner</h2>
            <span className="badge badge-info">{sessions.asLearner.length}</span>
          </div>

          {sessions.asLearner.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-gray-500">No learning sessions yet</p>
              <Link to="/browse" className="btn-primary mt-4 inline-block">
                Browse Skills
              </Link>
            </div>
          ) : (
            sessions.asLearner.map((s) => <SessionCard key={s._id} s={s} asMentor={false} />)
          )}
        </div>

        {/* As Mentor */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-bold text-gray-800">As Mentor</h2>
            <span className="badge badge-success">{sessions.asMentor.length}</span>
          </div>

          {sessions.asMentor.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-gray-500">No teaching sessions yet</p>
              <Link to="/skills" className="btn-primary mt-4 inline-block">
                Add Skills
              </Link>
            </div>
          ) : (
            sessions.asMentor.map((s) => <SessionCard key={s._id} s={s} asMentor={true} />)
          )}
        </div>
      </div>
    </div>
  );
}
