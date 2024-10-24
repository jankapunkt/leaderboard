import { Meteor } from 'meteor/meteor';
import { Template } from "meteor/templating";
import { Mongo } from "meteor/mongo";
import { Session } from "meteor/session";
// Set up a collection to contain player information. On the server,
// it is backed by a MongoDB collection named "players".

const Players = new Mongo.Collection("players");

if (Meteor.isClient) {
  Meteor.subscribe('players')
  const initiallyVoted = localStorage.getItem('__voted__')
  Session.set({ voted: !!initiallyVoted })
  
  Template.leaderboard.helpers({
    players: function () {
      return Players.find({}, { sort: { score: -1, name: 1 } });
    },
    selectedName: function () {
      const player = Players.findOne(Session.get("selectedPlayer"));
      return player && player.name;
    },
    voted () {
      return Session.get('voted')
    },
    error () {
      return Session.get('error')
    }
  });

  Template.leaderboard.events({
    'click .inc': function () {
      if (Session.get('voted')) { return }
      Meteor.call('inc', Session.get("selectedPlayer"), (err) => {
        if (!err) {
          Session.set('voted', true)
          localStorage.setItem('__voted__', true)
        } else {
          console.error(err)
          Session.set('error' ,err.message)
        }
        Session.set('selectedPlayer', null)
      })
    }
  });

  Template.player.helpers({
    selected: function () {
      return Session.equals("selectedPlayer", this._id) ? "selected" : '';
    }
  });

  Template.player.events({
    'click': function () {
      Session.set("selectedPlayer", this._id);
    }
  });
}

// On server startup, create some players if the database is empty.
if (Meteor.isServer) {
  Meteor.startup(async () => {
    if (await Players.countDocuments({}) === 0) {
      const names = ['React', 'Vue', 'Blaze', 'Svelte', 'Solid', 'Angular', 'Other'];
      for (const name of names) {
        await Players.insertAsync({ name: name, score: 0 });
      }
    }
  });

  Meteor.publish('players', function () {
    return Players.find()
  })

  Meteor.methods({
    async 'inc' (_id) {
      const updated = await Players.updateAsync({ _id }, {$inc: {score: 1 }});
      if (!updated) {
        throw new Meteor.Error('update failed', `Could not update by _id ${_id}`, updated)
      }
    },
    async reset () {
      await Players.updateAsync({}, { $set: { score: 0 } }, { multi: true })
    }
  })
}
