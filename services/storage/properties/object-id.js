const ObjectID = require('mongodb').ObjectID;
module.exports = {construct: ObjectID, emptyStringToNull: true, canCreateWithNull: false};
