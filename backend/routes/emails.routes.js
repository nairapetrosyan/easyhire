const { Router } = require('express');
const emailHandlers = require('../handlers/email');

const emailRoutes = Router();

emailRoutes.get('/', emailHandlers.emails);
emailRoutes.delete('/:ID', emailHandlers.deleteEmails);
emailRoutes.post('/move', emailHandlers.emailsMoveToFolder);
emailRoutes.post('/mark', emailHandlers.mark);
emailRoutes.get('/:id', emailHandlers.getEmail);

module.exports = emailRoutes;