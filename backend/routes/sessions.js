const express = require('express');
const { body, validationResult } = require('express-validator');
const Session = require('../models/Session');
const Skill = require('../models/Skill');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();
const POINTS_PER_SESSION = 10;

// My sessions (as learner or mentor)
router.get('/my', auth, async (req, res) => {
  try {
    const asLearner = await Session.find({ learnerId: req.user._id })
      .populate('mentorId', 'name email contact')
      .populate('skillId', 'title category')
      .sort({ createdAt: -1 });
    const asMentor = await Session.find({ mentorId: req.user._id })
      .populate('learnerId', 'name email contact')
      .populate('skillId', 'title category')
      .sort({ createdAt: -1 });
    res.json({ asLearner, asMentor });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Request session (learner)
router.post(
  '/',
  auth,
  [
    body('skillId').isMongoId().withMessage('Valid skill ID required'),
    body('date').isISO8601().withMessage('Valid date required'),
    body('timeSlot').trim().notEmpty().withMessage('Time slot required'),
    body('teachingMode').isIn(['in-person', 'online', 'flexible']).withMessage('Invalid teaching mode'),
  ],
  async (req, res) => {
    try {
      if (req.user.role !== 'student') {
        return res.status(403).json({ error: 'Students only' });
      }
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const skill = await Skill.findById(req.body.skillId);
      if (!skill) return res.status(404).json({ error: 'Skill not found' });
      if (skill.mentorId.toString() === req.user._id.toString()) {
        return res.status(400).json({ error: 'Cannot request your own skill' });
      }
      const session = new Session({
        learnerId: req.user._id,
        mentorId: skill.mentorId,
        skillId: skill._id,
        date: req.body.date,
        timeSlot: req.body.timeSlot,
        teachingMode: req.body.teachingMode,
        status: 'pending',
      });
      await session.save();
      const populated = await Session.findById(session._id)
        .populate('mentorId', 'name email')
        .populate('skillId', 'title category');
      res.status(201).json(populated);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
);

// Update session status (mentor: accept/reschedule, or mark completed)
router.patch('/:id', auth, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const { status } = req.body;
    if (!['pending', 'accepted', 'rescheduled', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const isMentor = session.mentorId.toString() === req.user._id.toString();
    const isLearner = session.learnerId.toString() === req.user._id.toString();

    if (status === 'accepted' || status === 'rescheduled') {
      if (!isMentor) return res.status(403).json({ error: 'Only mentor can accept/reschedule' });
      session.status = status;
      if (req.body.date) session.date = req.body.date;
      if (req.body.timeSlot) session.timeSlot = req.body.timeSlot;
    } else if (status === 'completed') {
      if (!isMentor && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only mentor or admin can mark completed' });
      }
      if (session.status !== 'completed') {
        session.status = 'completed';
        await User.findByIdAndUpdate(session.mentorId, { $inc: { points: POINTS_PER_SESSION } });
      }
    } else {
      return res.status(400).json({ error: 'Invalid status change' });
    }

    await session.save();
    const updated = await Session.findById(session._id)
      .populate('mentorId', 'name email points')
      .populate('learnerId', 'name email')
      .populate('skillId', 'title category');
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
