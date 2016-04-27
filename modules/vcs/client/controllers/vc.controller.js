'use strict';

angular.module ('vcs')

// -------------------------------------------------------------------------
//
// controller for listing vcs
//
// -------------------------------------------------------------------------
.controller ('controllerVcList',
	['$scope', '$rootScope', '$stateParams', 'VcModel', 'NgTableParams', 'PILLARS',
	function ($scope, $rootScope, $stateParams, VcModel, NgTableParams, PILLARS) {

	//console.log ('controllerVcList is running');

	var self = this;

	//
	// map out any supporting data
	//
	self.pillars = PILLARS.map (function (e) {
		return {id:e,title:e};
	});
	self.project = $stateParams.project;

	//
	// set or reset the collection
	//
	var setData = function () {
		VcModel.forProject ($stateParams.project).then (function (data) {
			// console.log ('controllerVcList data received: ', data);
			self.collection = data;
			self.tableParams = new NgTableParams ({count: 10}, {dataset: data});
		});
	};

	//
	// listen for when to reset
	//
	var unbind = $rootScope.$on('refreshVcList', function() {
		setData();
	});
	$scope.$on('$destroy', unbind);

	//
	// finally, set the data
	//
	setData();
}])

.controller ('controllerAddTopicModal',
	['$modalInstance', '$scope', '_', '$stateParams', 'codeFromTitle', 'VcModel', 'TopicModel', 'PILLARS',
	function ($modalInstance, $scope, _, $stateParams, codeFromTitle, VcModel, TopicModel, PILLARS) {

		var self = this;
		self.data = null;
		self.current = [];
		self.currentObjs = [];
		self.project = $stateParams.project;

		TopicModel.forType('Valued Component').then( function (data) {
			self.data = data;
			$scope.$apply();
		});

		this.toggleItem = function (item) {
			// console.log("item:",item);
			var idx = self.current.indexOf(item._id);
			// console.log(idx);
			if (idx === -1) {
				self.currentObjs.push(item);
				self.current.push(item._id);
			} else {
				_.remove(self.currentObjs, {_id: item._id});
				_.remove(self.current, function(n) {return n === item._id;});
			}
		};

		this.ok = function () {
			// console.log("data:",self.currentObjs[0]);
			var savedArray = [];
			// console.log("length: ",self.currentObjs.length);
			_.each( self.currentObjs, function(obj, idx) {
				// console.log("Adding " + obj.description + " to Valued Components");
				VcModel.getNew().then(function (m) {
					m.project = $scope.project;
					m.name = obj.name;
					m.title = obj.name;
					m.type = obj.type;
					VcModel.query({project: $scope.project})
					.then(function(data) {
						// Take the end of the string, assume it's a number,
						// and increment accordingly.
						var suffix = "-1";
						if (data && data.length > 0) {
							// get the last one and slice it
							var existingCode = data[data.length-1].code.slice(-1);
							existingCode++;
							suffix = "-"+existingCode;
						}
						m.code = codeFromTitle(obj.name+"-"+m.project.code+suffix);
						// console.log("saving:",m);
						VcModel.saveCopy(m).then(function (saved) {
							savedArray.push(saved);
							if (idx === self.currentObjs.length-1) {
								// Return the collection back to the caller
								$modalInstance.close(savedArray);
							}
						});
					});
				});
			});
		};

		this.cancel = function () {
			// console.log ('cancel clicked');
			$modalInstance.dismiss('cancel');
		};
}])

// -------------------------------------------------------------------------
//
// controller for editing or adding vcs
//
// -------------------------------------------------------------------------
.controller ('controllerEditVcModal',
	['$modalInstance', '$scope', '_', 'codeFromTitle', 'VcModel', 'TopicModel', 'PILLARS',
	function ($modalInstance, $scope, _, codeFromTitle, VcModel, TopicModel, PILLARS) {

	// console.log ('controllerEditVcModal is running');

	var self = this;

	//
	// pull the mode and other info from the scope inputs
	//
	this.mode = $scope.mode;

	//
	// set up any data from services that needs massaging
	//
	this.pillars = PILLARS;

	// -------------------------------------------------------------------------
	//
	// set up handlers and functions on scope
	//
	// -------------------------------------------------------------------------
	this.selectTopic = function () {
		var self = this;
		TopicModel.getTopicsForPillar (this.vc.pillar).then (function (topics) {
			self.topics = topics;
			$scope.$apply();
		});
	};
	this.ok = function () {
		// console.log ('save clicked');
		this.vc.code = codeFromTitle (this.vc.name);
		// console.log ('new code = ', this.vc.code);
		if (this.mode === 'add') {
			VcModel.saveModel ().then (function (result) {
				$modalInstance.close(result);
			});
		}
		else if (this.mode === 'edit') {
			VcModel.saveModel ().then (function (result) {
				$scope.vc = _.cloneDeep (result);
				$modalInstance.close(result);
			});
		}
		else {
			$modalInstance.dismiss ('cancel');
		}
	};
	this.cancel = function () {
		// console.log ('cancel clicked');
		$modalInstance.dismiss('cancel');
	};

	//
	// finally, deal with the mode and setting data up for each one
	// and kick off the directive
	//
	if (this.mode === 'add') {
		this.dmode = 'Add';
		VcModel.getNew ().then (function (model) {
			self.vc = model;
			self.selectTopic ();
		});
	} else if (this.mode === 'edit') {
		this.dmode = 'Edit';
		this.vc = VcModel.getCopy ($scope.vc);
		VcModel.setModel (this.vc);
		this.selectTopic ();
	} else {
		this.dmode = 'View';
		this.vc = $scope.vc;
		this.selectTopic ();
	}
}])

;

