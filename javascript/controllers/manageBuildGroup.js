CDash.filter('filter_builds', function() {
  // Filter the builds based on what group they belong to.
  return function(input, group) {
    if (typeof group === 'undefined' || group === null) {
      // No filtering required for default "All" group.
      return input;
    }

    group_id = Number(group.id);
    var output = [];
    for (var i = 0; i < input.length; i++) {
      if (Number(input[i].groupid) === group_id) {
        output.push(input[i]);
      }

    }
    return output;
  };
})

.filter('filter_groups', function() {
  // Filter BuildGroups based on their type
  return function(input, type) {
    if (typeof type === 'undefined' || type === null) {
      return input;
    }
    var output = [];
    for (var i = 0; i < input.length; i++) {
      if (input[i].type === type) {
        output.push(input[i]);
      }
    }
    return output;
  };
})

.controller('ManageBuildGroupController', function ManageBuildGroupController($scope, $http) {
  $scope.loading = true;
  $http({
    url: 'api/v1/manageBuildGroup.php',
    method: 'GET',
    params: queryString
  }).success(function(cdash) {
    $scope.cdash = cdash;

    // Sort BuildGroups by position.
    if ($scope.cdash.buildgroups) {
      $scope.cdash.buildgroups.sort(function (a, b) {
        return Number(a.position) - Number(b.position);
      });

      // Update positions when the user stops dragging.
      $scope.sortable = {
        stop: function(e, ui) {
          for (var index in $scope.cdash.buildgroups) {
            $scope.cdash.buildgroups[index].position = index;
          }
        }
      };
    }

    // Define different types of buildgroups.
    $scope.cdash.buildgrouptypes = [
      {name: "Daily", value: "Daily"},
      {name: "Latest", value: "Latest"}
    ];
    $scope.buildType = $scope.cdash.buildgrouptypes[0];
  }).finally(function() {
    $scope.loading = false;
  });

  /** create a new buildgroup */
  $scope.createBuildGroup = function(newBuildGroup, type) {
    var parameters = {
      projectid: $scope.cdash.project.id,
      newbuildgroup: newBuildGroup,
      type: type
    };
    $http.post('api/v1/buildgroup.php', parameters)
    .success(function(buildgroup) {
      if (buildgroup.error) {
        $scope.cdash.error = buildgroup.error;
      }
      else {
        $("#buildgroup_created").show();
        $("#buildgroup_created").delay(3000).fadeOut(400);

        // Add this new buildgroup to our scope.
        $scope.cdash.buildgroups.push(buildgroup);

        if (type != "Daily") {
          $scope.cdash.dynamics.push(buildgroup);
        }
      }
    });
  };

  /** change the order that the buildgroups appear in */
  $scope.updateBuildGroupOrder = function() {
    var newLayout = getSortedElements("#sortable");
    var parameters = {
      projectid: $scope.cdash.project.id,
      newLayout: newLayout
    };
    $http.post('api/v1/buildgroup.php', parameters)
    .success(function(resp) {
      if (resp.error) {
        $scope.cdash.error = resp.error;
      }
      else {
        $("#order_updated").show();
        $("#order_updated").delay(3000).fadeOut(400);
      }
    });
  };

  /** modify an existing buildgroup */
  $scope.saveBuildGroup = function(buildgroup, summaryemail) {
    var parameters = {
      projectid: $scope.cdash.project.id,
      buildgroup: buildgroup
    };
    $http({
      url: 'api/v1/buildgroup.php',
      method: 'PUT',
      params: parameters
    }).success(function(resp) {
      if (resp.error) {
        $scope.cdash.error = resp.error;
      }
      else {
        $("#buildgroup_updated_" + buildgroup.id).show();
        $("#buildgroup_updated_" + buildgroup.id).delay(3000).fadeOut(400);
      }
    });
  };

  /** delete a buildgroup */
  $scope.deleteBuildGroup = function(buildgroupid) {
    if (window.confirm("Are you sure you want to delete this BuildGroup? If the BuildGroup is not empty, builds will be put in their original BuildGroup.")) {

      var parameters = {
        projectid: $scope.cdash.project.id,
        buildgroupid: buildgroupid
      };
      $http({
        url: 'api/v1/buildgroup.php',
        method: 'DELETE',
        params: parameters
      }).success(function() {
        // Find the index of the group to remove.
        var index = -1;
        for(var i = 0, len = $scope.cdash.buildgroups.length; i < len; i++) {
          if ($scope.cdash.buildgroups[i].id === buildgroupid) {
            index = i;
            break;
          }
        }
        if (index > -1) {
          // Remove the buildgroup from our scope.
          $scope.cdash.buildgroups.splice(index, 1);
        }
      });
    }
  };


  /** move builds to a different group */
  $scope.moveBuilds = function(builds, group, expected) {
    var parameters = {
      projectid: $scope.cdash.project.id,
      builds: builds,
      group: group,
      expected: expected
    };
    $http.post('api/v1/buildgroup.php', parameters)
    .success(function(buildgroup) {
      if (buildgroup.error) {
        $scope.cdash.error = buildgroup.error;
      }
      else {
        $("#builds_moved").show();
        $("#builds_moved").delay(3000).fadeOut(400);
      }
    });
  };


  /** Add rule for a wildcard BuildGroup */
  $scope.addWildcardRule = function(group, type, nameMatch) {
    var parameters = {
      projectid: $scope.cdash.project.id,
      group: group,
      type: type,
      nameMatch: nameMatch
    };
    $http.post('api/v1/buildgroup.php', parameters)
    .success(function(buildgroup) {
      if (buildgroup.error) {
        $scope.cdash.error = buildgroup.error;
      }
      else {
        $("#wildcard_defined").show();
        $("#wildcard_defined").delay(3000).fadeOut(400);
      }
    });
  };


  /** delete a wildcard rule */
  $scope.deleteWildcardRule = function(wildcard) {
    var parameters = {
      projectid: $scope.cdash.project.id,
      wildcard: wildcard
    };
    $http({
      url: 'api/v1/buildgroup.php',
      method: 'DELETE',
      params: parameters
    }).success(function() {
      // Find the index of the wildcard to remove.
      var index = $scope.cdash.wildcards.indexOf(wildcard);
      if (index > -1) {
        // Remove this wildcard from our scope.
        $scope.cdash.wildcards.splice(index, 1);
      }
    });
  };


  /** add a build row to a dynamic group */
  $scope.addDynamicRow = function(dynamic, buildgroup, site, match) {
    var parameters = {
      projectid: $scope.cdash.project.id,
      dynamic: dynamic,
      buildgroup: buildgroup,
      site: site,
      match: match
    };
    $http.post('api/v1/buildgroup.php', parameters)
    .success(function(rule) {
      if (rule.error) {
        $scope.cdash.error = rule.error;
      }
      else {
        // Add this new rule to our scope.
        var idx = $scope.cdash.dynamics.indexOf(dynamic);
        if (idx > -1) {
          if ($scope.cdash.dynamics[idx].rules) {
            $scope.cdash.dynamics[idx].rules.push(rule);
          } else {
            $scope.cdash.dynamics[idx].rules = [rule];
          }
        }
        $("#dynamic_defined").show();
        $("#dynamic_defined").delay(3000).fadeOut(400);
      }
    });
  };

  $scope.deleteDynamicRule = function(dynamic, rule) {
    var parameters = {
      projectid: $scope.cdash.project.id,
      dynamic: dynamic,
      rule: rule
    };
    $http({
      url: 'api/v1/buildgroup.php',
      method: 'DELETE',
      params: parameters
    }).success(function() {
      // Find the index of the dynamic group in question.
      var idx1 = $scope.cdash.dynamics.indexOf(dynamic);
      if (idx1 > -1) {
        // Then find the index of the rule that's being removed.
        var idx2 = $scope.cdash.dynamics[idx1].rules.indexOf(rule);
        if (idx2 > -1) {
          // And remove it from our scope.
          $scope.cdash.dynamics[idx1].rules.splice(idx2, 1);
        }
      }
    });
  };


});
