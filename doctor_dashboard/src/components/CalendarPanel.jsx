import { useState, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid/index.js";
import timeGridPlugin from "@fullcalendar/timegrid/index.js";
import interactionPlugin from "@fullcalendar/interaction/index.js";
import listPlugin from "@fullcalendar/list/index.js";

const emptyForm = { date: "", start: "09:00", end: "10:00", note: "" };

const CalendarPanel = ({ availability = [], onCreateSlot, onUpdateSlot, onDeleteSlot }) => {
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [editingId, setEditingId] = useState(null);

  // Convert availability data to FullCalendar event format
  const events = useMemo(() => {
    if (!Array.isArray(availability)) return [];
    return availability
      .map((slot, index) => {
        if (!slot || typeof slot !== "object") {
          console.warn(`Invalid slot at index ${index}:`, slot);
          return null;
        }
        const startValue = slot.start ?? slot.begin;
        const endValue = slot.end ?? slot.finish;
        
        if (!startValue || !endValue) {
          console.warn(`Slot at index ${index} missing start/end:`, slot);
          return null;
        }

        const start = new Date(startValue);
        const end = new Date(endValue);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          console.warn(`Slot at index ${index} has invalid dates:`, slot);
          return null;
        }

        const possibleTitle = typeof slot.title === "string" ? slot.title.trim() : "";
        const possibleNote = typeof slot.note === "string" ? slot.note.trim() : "";
        const title = possibleTitle || possibleNote || "Available slot";

        return {
          id: slot.id ?? `slot-${index}`,
          title,
          start: start.toISOString(),
          end: end.toISOString(),
          extendedProps: {
            note: slot.note || "",
            originalSlot: slot,
          },
        };
      })
      .filter(Boolean);
  }, [availability]);

  const resetForm = () => {
    setFormData(emptyForm);
    setFormError("");
    setEditingId(null);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();

    if (!formData.date) {
      setFormError("Select a date for the availability slot.");
      return;
    }

    const startISO = `${formData.date}T${formData.start}`;
    const endISO = `${formData.date}T${formData.end}`;
    const start = new Date(startISO);
    const end = new Date(endISO);

    if (start >= end) {
      setFormError("End time must be after the start time.");
      return;
    }

    const payload = {
      start: start.toISOString(),
      end: end.toISOString(),
      note: formData.note.trim(),
      title: formData.note.trim() || "Available slot",
    };

    if (editingId) {
      onUpdateSlot?.(editingId, payload);
    } else {
      onCreateSlot?.(payload);
    }
    resetForm();
  };

  // Handle event click (for editing)
  const handleEventClick = (clickInfo) => {
    const event = clickInfo.event;
    setEditingId(event.id);
    setFormError("");
    
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    
    setFormData({
      date: startDate.toISOString().split("T")[0],
      start: startDate.toTimeString().slice(0, 5),
      end: endDate.toTimeString().slice(0, 5),
      note: event.extendedProps?.note || event.title || "",
    });
  };

  // Handle date/time selection (for creating new slots)
  const handleDateSelect = (selectInfo) => {
    setEditingId(null);
    setFormError("");
    
    const start = new Date(selectInfo.start);
    const end = new Date(selectInfo.end);
    
    setFormData({
      date: start.toISOString().split("T")[0],
      start: start.toTimeString().slice(0, 5),
      end: end.toTimeString().slice(0, 5),
      note: "",
    });
  };

  const handleDelete = () => {
    if (!editingId) return;
    onDeleteSlot?.(editingId);
    resetForm();
  };

  return (
    <div className="calendar-panel">
      <div className="calendar-panel__header">
        <div>
          <p className="eyebrow">Live calendar</p>
          <h2>Availability planner</h2>
          <p className="muted">
            Click and drag on the calendar to add a slot, or select an existing slot to edit or delete it.
          </p>
        </div>
      </div>
      <div className="calendar-panel__body">
        <div className="calendar-panel__canvas">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
            }}
            events={events}
            editable
            selectable
            selectMirror
            dayMaxEvents
            weekends
            select={handleDateSelect}
            eventClick={handleEventClick}
            height="100%"
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            allDaySlot={false}
            nowIndicator
          />
        </div>
        <form className="calendar-panel__form" onSubmit={handleFormSubmit} noValidate>
          <h3>{editingId ? "Edit slot" : "Add new slot"}</h3>
          <label className="form-field">
            <span>Date</span>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
              required
            />
          </label>
          <label className="form-field">
            <span>Start time</span>
            <input
              type="time"
              value={formData.start}
              onChange={(e) => setFormData((prev) => ({ ...prev, start: e.target.value }))}
              required
            />
          </label>
          <label className="form-field">
            <span>End time</span>
            <input
              type="time"
              value={formData.end}
              onChange={(e) => setFormData((prev) => ({ ...prev, end: e.target.value }))}
              required
            />
          </label>
          <label className="form-field">
            <span>Notes</span>
            <textarea
              rows={3}
              placeholder="E.g., video call, in-person, buffer time..."
              value={formData.note}
              onChange={(e) => setFormData((prev) => ({ ...prev, note: e.target.value }))}
            />
          </label>
          {formError && <p className="error-text">{formError}</p>}
          <div className="calendar-panel__actions">
            <button type="submit" className="primary">
              {editingId ? "Update slot" : "Create slot"}
            </button>
            {editingId && (
              <button type="button" className="ghost" onClick={handleDelete}>
                Delete
              </button>
            )}
            <button type="button" className="ghost" onClick={resetForm}>
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CalendarPanel;
