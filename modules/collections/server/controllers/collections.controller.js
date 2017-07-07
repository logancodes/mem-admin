'use strict';
// =========================================================================
//
// Controller for Collections
//
// =========================================================================
var _                  = require('lodash');
var path               = require('path');
var DBModel            = require(path.resolve('./modules/core/server/controllers/core.dbmodel.controller'));
var DocumentClass      = require(path.resolve('./modules/documents/server/controllers/core.document.controller'));
var CollectionDocClass = require(path.resolve('./modules/collections/server/controllers/collectionDocuments.controller'));

module.exports = DBModel.extend({
	name     : 'Collection',
	plural   : 'collections',
	populate : [{
		path     : 'addedBy',
		select   : '_id displayName username email orgName'
	}, {
		path     : 'updatedBy',
		select   : '_id displayName username email orgName'
	}, {
		path     : 'mainDocument',
		populate : [{
			path   : 'addedBy',
			select : '_id displayName username email orgName'
		}, {
			path   : 'updatedBy',
			select : '_id displayName username email orgName'
		}, {
			path   : 'document',
		}]
	}, {
		path     : 'otherDocuments',
		populate : [{
			path   : 'addedBy',
			select : '_id displayName username email orgName'
		}, {
			path   : 'updatedBy',
			select : '_id displayName username email orgName'
		}, {
			path   : 'document',
		}]
	}],

	getAll: function() {
		return this.list();
	},

	getForProject: function(projectId) {
		return this.list({ project: projectId });
	},

	publish: function(collectionId) {
		return this.findById(collectionId).then(function(collection) {
			if (!collection) return;

			// Create a News item?
			collection.publish();
			return collection.save();
		});
	},

	unpublish: function(collectionId) {
		return this.findById(collectionId).then(function(collection) {
			if (!collection) return;

			collection.unpublish();
			return collection.save();
		});
	},

	removeCollection: function(collectionId) {
		var self = this;

		return this.findById(collectionId).then(function(collection) {
			if (!collection) return;

			// Remove the collection from the documents first
			var Document = new DocumentClass(self.opts);

			if (collection.mainDocument) {
				Document.findById(collection.mainDocument.document._id).then(function(document) {
					document.collections = _.reject(document.collections, function(c) {
						return c.equals(collectionId);
					});
					document.save();
				});
			}
			_.each(collection.otherDocuments, function(cd) {
				Document.findById(cd.document._id).then(function(document) {
					document.collections = _.reject(document.collections, function(c) {
						return c.equals(collectionId);
					});
					document.save();
				});
			});

			// Remove the collection documents next
			var CollectionDocument = new CollectionDocClass(self.opts);
			var deletePromises = _.map(collection.otherDocuments, function(cd) {
				return CollectionDocument.delete(cd);
			});

			if (collection.mainDocument) {
				deletePromises.push(CollectionDocument.delete(collection.mainDocument));
			}

			Promise.all(deletePromises).then(function () {
				// Now delete the collection
				return collection.remove();
			});
		});
	},

	addOtherDocument: function(collectionId, documentId) {
		var self = this;

		return this.findById(collectionId).then(function(collection) {
			if (!collection) return;

			// Is the document already in there?
			if (!_.find(collection.otherDocuments, function(cd) {
				return cd.document._id.equals(documentId);
			})) {
				// Is it the main document?
				if (collection.mainDocument && collection.mainDocument.document._id.equals(documentId)) {
					// Add it to other documents and remove it as the main document
					collection.otherDocuments.push(collection.mainDocument);
					collection.mainDocument = null;
					collection.save();
				} else {
					// Add it
					var Document = new DocumentClass(self.opts);
					Document.findById(documentId).then(function(document) {
						// Add to document collection
						document.collections.push(collection);
						document.save();

						// Add to collection
						var CollectionDocument = new CollectionDocClass(self.opts);
						CollectionDocument.create({
							document    : document,
							displayName : document.displayName,
							sortOrder   : 0
						}).then(function(collectionDocument) {
							collection.otherDocuments.push(collectionDocument);
							return collection.save();
						});
					});
				}
			}
		});
	},

	removeOtherDocument: function(collectionId, documentId) {
		var self = this;

		return this.findById(collectionId).then(function(collection) {
			if (!collection) return;

			// Is the document in the collection?
			var collectionDocument = _.find(collection.otherDocuments, function(cd) {
				return cd.document._id.equals(documentId);
			});

			if (collectionDocument) {
				// Remove from document
				var Document = new DocumentClass(self.opts);
				Document.findById(documentId).then(function(document) {
					document.collections = _.reject(document.collections, function(c) {
						return c.equals(collectionId);
					});
					document.save();

					// Remove from Collection
					collection.otherDocuments = _.without(collection.otherDocuments, collectionDocument);
					collection.save();

					// Remove from CollectionDocument
					var CollectionDocument = new CollectionDocClass(self.opts);
					CollectionDocument.delete(collectionDocument);
				});
			}
		});
	},

	addMainDocument: function(collectionId, documentId) {
		var self = this;

		return this.findById(collectionId).then(function(collection) {
			if (!collection) return;

			// Is this already the main document?
			if (!collection.mainDocument || !collection.mainDocument.document._id.equals(documentId)) {
				// It the document in the other documents?
				var collectionDocument = _.find(collection.otherDocuments, function(cd) {
					return cd.document._id.equals(documentId);
				});

				if (collectionDocument) {
					if (collection.mainDocument) {
						// Remove current main document
						self.removeCollectionDocument(collectionId, documentId, collection.mainDocument);
					}

					// Remove it from other documents and add it as the main document
					collection.otherDocuments = _.without(collection.otherDocuments, collectionDocument);
					collection.mainDocument = collectionDocument;
					collection.date = collectionDocument.document.documentDate;
					collection.save();
				} else {
					// Add it
					var Document = new DocumentClass(self.opts);
					Document.findById(documentId).then(function(document) {
						// Add to document collection
						document.collections.push(collection);
						document.save();

						// Add to collection
						var CollectionDocument = new CollectionDocClass(self.opts);
						CollectionDocument.create({
							document    : document,
							displayName : document.displayName,
							sortOrder   : 0
						}).then(function(collectionDocument) {
							if (collection.mainDocument) {
								// Remove current main document
								self.removeCollectionDocument(collectionId, documentId, collection.mainDocument);
							}
							collection.mainDocument = collectionDocument;
							return collection.save();
						});
					});
				}
			}
		});
	},

	removeMainDocument: function(collectionId, documentId) {
		var self = this;

		return this.findById(collectionId).then(function(collection) {
			if (!collection) return;

			// Is this the main document?
			if (collection.mainDocument && collection.mainDocument.document._id.equals(documentId)) {
				// Remove from document
				self.removeCollectionDocument(collectionId, documentId, collection.mainDocument);

				// Remove from Collection
				collection.mainDocument = null;
				collection.save();
			}
		});
	},

	removeCollectionDocument: function(collectionId, documentId, collectionDocument) {
		var Document = new DocumentClass(this.opts);
		var CollectionDocument = new CollectionDocClass(this.opts);

		// Remove from document
		Document.findById(documentId).then(function(document) {
			document.collections = _.reject(document.collections, function(c) {
				return c.equals(collectionId);
			});
			document.save();

			// Remove from CollectionDocument
			CollectionDocument.delete(collectionDocument);
		});
	},
});
