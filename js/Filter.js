define(function(){
  function Filter(project) {
    function filter() {
    }

    filter.time = [project.startAtTime, project.endAtTime];
    filter.packages = project.packages.slice(0);
    filter.resources = project.resources.slice(0);

    filter.setTime = function(time){
      filter.time = time;
      return filter;
    }

    filter.getTime = function(){
      return filter.time;
    }

    filter.setPackages = function(packages){
      filter.packages = packages;
      return filter;
    }

    filter.getPackages = function(){
      return filter.packages.filter(function(t){return !t.isSetup});
    }
    
    filter.setResources = function(resources){
      filter.resources = resources;
    }

    filter.getResources = function(){
      return filter.resources;
    }

    filter.getResourcesFromResourceType = function(resourceType){
      return filter.getResources().filter(function(r){return r.resourceType == resourceType;});
    }

    filter.getResourceTypes = function(){
      var resourceTypes = [];
      filter.getResources().forEach(function(resource){
        if(resourceTypes.indexOf(resource.resourceType) < 0)
          resourceTypes.push(resource.resourceType);
      });
      return resourceTypes;
    }

    filter.getTasks = function(){
      return filter.getResources().map(function(r){return r.tasks;}).reduce(function(a, b){return a.concat(b);});
    }

    filter.packageFiltered = function(){
      return filter.packages.length != project.packages.length;
    }

    filter.clone = function(){
      var cloned = Filter(project);
      cloned.time = [
        filter.time[0],
        filter.time[1]
      ]
      cloned.packages = filter.packages.slice(0);
      return cloned;
    }
    
    filter.cloneWithProject = function(project2){
      var cloned = Filter(project2);
      cloned.time = [project2.startAtTime, project2.endAtTime];// filter.time[0], filter.time[1]];
      
      var packages = [];
      filter.packages.forEach(function(package){
        packages.push(project2.findPackageById(package.id));
      });
      cloned.setPackages(packages);

      var resources = [];
      filter.getResources().forEach(function(resource){
        resources.push(project2.findResourceById(resource.id));
      });
      cloned.setResources(resources);

      return cloned;
    }

    return filter;
  }

  return Filter;
});
