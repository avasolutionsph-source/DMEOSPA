import { Router } from 'express';
import RoomAssignment from '../../models/RoomAssignment.js';
import { authenticateJWT } from '../../middleware/auth.js';

const router = Router();

// Get all room assignments for a user
router.get('/', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.userId;

        const assignments = await RoomAssignment.find({ userId })
            .populate('employeeId', 'firstName lastName position')
            .sort({ roomName: 1, employeeName: 1 });

        res.json({
            success: true,
            data: assignments
        });
    } catch (error) {
        console.error('Error fetching room assignments:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch room assignments'
        });
    }
});

// Get assignments for a specific room
router.get('/room/:roomName', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { roomName } = req.params;

        const assignments = await RoomAssignment.find({
            userId,
            roomName
        }).populate('employeeId', 'firstName lastName position');

        res.json({
            success: true,
            data: assignments
        });
    } catch (error) {
        console.error('Error fetching room assignments:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch room assignments'
        });
    }
});

// Update room assignments (replace all assignments for a room)
router.put('/room/:roomName', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { roomName } = req.params;
        const { roomId, employees } = req.body; // employees is array of {id, name, position}

        console.log('📝 [ROOM-ASSIGNMENTS] Updating assignments:', {
            userId,
            roomName,
            roomId,
            employeeCount: employees.length
        });

        // Delete existing assignments for this room
        await RoomAssignment.deleteMany({ userId, roomName });

        // Create new assignments
        const newAssignments = employees.map(emp => ({
            userId,
            roomName,
            roomId,
            employeeId: emp.id,
            employeeName: emp.name,
            employeePosition: emp.position,
            assignedBy: userId
        }));

        if (newAssignments.length > 0) {
            await RoomAssignment.insertMany(newAssignments);
        }

        // Fetch and return updated assignments
        const updatedAssignments = await RoomAssignment.find({
            userId,
            roomName
        }).populate('employeeId', 'firstName lastName position');

        console.log('✅ [ROOM-ASSIGNMENTS] Assignments updated successfully');

        res.json({
            success: true,
            data: updatedAssignments,
            message: `Room assignments updated for ${roomName}`
        });
    } catch (error) {
        console.error('Error updating room assignments:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update room assignments'
        });
    }
});

// Delete assignment
router.delete('/:assignmentId', authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { assignmentId } = req.params;

        await RoomAssignment.findOneAndDelete({
            _id: assignmentId,
            userId
        });

        res.json({
            success: true,
            message: 'Assignment deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting room assignment:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete room assignment'
        });
    }
});

export default router;
