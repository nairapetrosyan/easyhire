const fetch = require('node-fetch');
const EmailsModel = require('../models/EmailsModel.js');
const StatusesModel = require('../models/FoldersModel.js');
const emailHelpers = require('../helpers/email.helper.js');

const statusHandlers = {};
module.exports = statusHandlers;

statusHandlers.getStatuses = (req, response) => {
  const userId = req.session.userID;
  if (!userId) {
    return response.json({ statuses: [] });
  }
  return EmailsModel.count({ userId })
    .then(inboxCount => StatusesModel
      .aggregate([
        { $match: { $or: [{ userId: null }, { userId }] } },
        {
          $lookup: {
            from: 'emails',
            localField: '_id',
            foreignField: 'status',
            as: 'emails',
          },
        },
        {
          $unwind: {
            path: '$emails',
            preserveNullAndEmptyArrays: true,
          },
        },
        { $match: { $or: [{ 'emails.userId': userId }, { emails: { $exists: false } }] } },
        {
          $group: {
            _id: '$_id',
            name: { $first: '$name' },
            icon: { $first: '$icon' },
            userId: { $first: '$userId' },
            emails: { $push: '$emails' },
            // count: {  $sum: 1}
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            icon: 1,
            userId: 1,
            count: { $size: '$emails' },
          },
        },
        { $sort: { userId: 1, name: 1 } },
      ])
      .then((statuses) => {
        const packed = {
          statuses,
          inboxCount,
        };
        response.json(packed);
      })).catch({ statuses: [], inboxCount: 0, errors: [] });
};

// Create new status
statusHandlers.createStatus = (req, res) => {
  req.checkBody('statusName').notEmpty().withMessage('Status name is required');
  const errors = req.validationErrors();
  if (errors) {
    return res.json({ errors, createdStatus: {} });
  }
  const userId = req.session.userID;
  const name = req.body.statusName;
  const icon = req.body.icon ? req.body.icon : 'fa-folder';
  const newStatus = new StatusesModel({
    name,
    icon,
    userId,
  });
  return newStatus.save()
    .then((createdStatus) => {
      const createdStatusToSend = {
        _id: createdStatus._id,
        name: createdStatus.name,
        count: 0,
        icon: createdStatus.icon,
        userId: createdStatus.userId,
        isActive: false,
      };
      return res.json({ createdStatus: createdStatusToSend, errors: [] });
    })
    .catch(() => res.json({ errors: [{ msg: 'Something went wrong' }], createdStatus: {} }));
};

// Update existing status
statusHandlers.updateStatus = (req, res) => {
  req.checkBody('statusName').notEmpty().withMessage('Status name is required');
  const errors = req.validationErrors();
  if (errors) {
    return res.json({ errors, updatedStatus: {} });
  }
  const statusId = req.params.ID ? req.params.ID : '';
  const statusNewName = req.body.statusName;
  return StatusesModel.findByIdAndUpdate(statusId, { $set: { name: statusNewName } }, { new: true })
    .then((status) => {
      res.json({ updatedStatus: status, errors: [] });
    })
    .catch(() => res.json({ errors: [{ msg: 'Something went wrong' }], updatedStatus: {} }));
};

// Delete status
// Cannot delete default statues and statuses which contain emails.
// Default statues - Approved, Rejected, Interview Scheduled, Not Reviewed
statusHandlers.deleteStatus = (req, res) => {
  StatusesModel.findOne({ userId: req.session.userID, _id: req.params.ID })
    .then((status) => {
      if (status) {
        return EmailsModel.find({ status: status.id })
          .then((emails) => {
            if (emails.length > 0) {
              res.json({
                errors: [{ msg: 'There are emails with this status and status cannot be deleted' }],
                deletedStatusID: '',
              });
            } else {
              StatusesModel.findOne({ userId: req.session.userID, _id: req.params.ID })
                .remove().exec();
              res.json({ deletedStatusID: req.params.ID, errors: [] });
            }
          });
      }
      return res.json({ errors: [{ msg: 'Main statuses "Approved", "Rejected", "Interview Scheduled" and "Not Reviewed" cannot be deleted' }], deletedStatusID: '' });
    })
    .catch(err => res.json({ errors: err, deletedStatusID: '' }));
};

// Get status emails
statusHandlers.getEmails = (req, res) => {
  req.checkParams('ID').notEmpty().withMessage('Status ID is required');
  const errors = req.validationErrors();
  if (errors) {
    return res.json({ errors });
  }
  const userId = req.session.userID;
  const statusId = req.params.ID;
  const { accessToken } = req.session;
  const emailsToSend = [];
  const promises = [];
  return EmailsModel.find({ status: statusId, userId }, ['emailId', 'isRead'])
    .populate('status', 'name').populate('folder', 'name _id')
    .then((result) => {
      for (let i = 0; i < result.length; i += 1) {
        const id = result[i].emailId;
        promises.push(fetch(`https://www.googleapis.com/gmail/v1/users/${userId}/messages/${id}?access_token=${accessToken}`)
          .then(response => response.json())
          .then((msgRes) => {
            emailsToSend[i] = emailHelpers.extract(
              msgRes,

              statusId,
              result[i].status.name,
              result[i].isRead,
            );
          }));
      }
      return Promise.all(promises)
        .then(() => {
          res.json({ emailsToSend, errors: [] });
        });
    })
    .catch(err => res.json({ emailsToSend: [], errors: err }));
};