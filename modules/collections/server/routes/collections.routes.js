'use strict';
// =========================================================================
//
// Routes for Collections
//
// =========================================================================
var path            = require('path');
var CollectionClass = require(path.resolve('./modules/collections/server/controllers/collections.controller'));
var routes          = require(path.resolve('./modules/core/server/controllers/core.routes.controller'));
var policy          = require(path.resolve('./modules/core/server/controllers/core.policy.controller'));

module.exports = function(app) {
	routes.setCRUDRoutes(app, 'collection', CollectionClass, policy);

	// Get all collections
	app.route('/api/collections/')
		.all(policy('guest'))
		.get(routes.setAndRun(CollectionClass, function(model, req) {
			return model.getAll();
		}));

	// Get all collections for a project
	app.route('/api/collections/project/:projectId')
		.all(policy('guest'))
		.get(routes.setAndRun(CollectionClass, function(model, req) {
			return model.getForProject(req.params.projectId);
		}));

	// Delete a collection
	app.route('/api/collections/:collectionId/remove')
		.all(policy('user'))
		.put(routes.setAndRun(CollectionClass, function(model, req) {
			return model.removeCollection(req.params.collectionId);
		}));

	// Publish a collection
	app.route('/api/collections/:collectionId/publish')
		.all(policy('user'))
		.put(routes.setAndRun(CollectionClass, function(model, req) {
			return model.publish(req.params.collectionId);
		}));

	// Unpublish a collection
	app.route('/api/collections/:collectionId/unpublish')
		.all(policy('user'))
		.put(routes.setAndRun(CollectionClass, function(model, req) {
			return model.unpublish(req.params.collectionId);
		}));

	// Add a document to a collection
	app.route('/api/collections/:collectionId/document/:documentId/add')
		.all(policy('user'))
		.put(routes.setAndRun(CollectionClass, function(model, req) {
			return model.addOtherDocument(req.params.collectionId, req.params.documentId);
		}));

	// Remove a document from a collection
	app.route('/api/collections/:collectionId/document/:documentId/remove')
		.all(policy('user'))
		.put(routes.setAndRun(CollectionClass, function(model, req) {
			return model.removeOtherDocument(req.params.collectionId, req.params.documentId);
		}));

	// Add a main document to a collection
	app.route('/api/collections/:collectionId/document/:documentId/main/add')
		.all(policy('user'))
		.put(routes.setAndRun(CollectionClass, function(model, req) {
			return model.addMainDocument(req.params.collectionId, req.params.documentId);
		}));

	// Remove a main document from a collection
	app.route('/api/collections/:collectionId/document/:documentId/main/remove')
		.all(policy('user'))
		.put(routes.setAndRun(CollectionClass, function(model, req) {
			return model.removeMainDocument(req.params.collectionId, req.params.documentId);
		}));
};

