// src\database-connector.js
const Datastore = require('nedb');
const path = require('path');

// Create a new NeDB instance
const db = new Datastore({
  filename: path.join(__dirname, '/database.db'),
  autoload: true
});
// Get all records
const getAllRecords = (callback) => {
    db.find({}, (err, docs) => {
      if (err) {
        console.error(err);
        return callback(null);
      }
      callback(docs);
    });
  };

// Get full user preferences document
const getUserPreferences = (userId, callback) => {
  db.findOne({ userId }, (err, doc) => {
    if (err) {
      console.error(err);
      return callback(null);
    }
    callback(doc);
  });
};

// Overwrite entire user preferences document
const setUserPreferences = (userId, prefsObj, callback) => {
  db.update(
    { userId },
    prefsObj,
    { upsert: true },
    (err) => {
      if (err) console.error(err);
      callback();
    }
  );
};

/**
 * Partially update just one command's preferences under preferences.<key>
 * Will also create the doc (with empty recentQueries) if none exists.
 *
 * @param {string} userId
 * @param {string} key       the sub‐key under preferences, e.g. 'jobs' or 'analyze'
 * @param {object} value     the object to store at preferences.<key>
 * @param {Function} callback
 */
const updateUserPreference = (userId, key, value, callback) => {
  db.update(
    { userId },
    {
      $set: { [`preferences.${key}`]: value }
    },
    { upsert: true },
    (err) => {
      if (err) console.error(err);
      callback();
    }
  );
};

// Remove a user‐doc entirely
const clearUserPreferences = (userId, callback) => {
  db.remove({ userId }, { multi: false }, (err, numRemoved) => {
    if (err) console.error(err);
    callback(err, numRemoved);
  });
};

module.exports = {
  getAllRecords,
  getUserPreferences,
  setUserPreferences,
  updateUserPreference,
  clearUserPreferences,
};