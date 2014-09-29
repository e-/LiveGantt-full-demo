define(['jquery', 'model'], function($, Model){
  function load(onSuccess, url){
    var 
        project = new Model.Project('My First Schedule');
    
    $.ajax({
      url: url,
      dataType: 'json',
      type: 'get',
      success: function(json){
        project.json = json;

        json.MachineTypes.forEach(function(m){
          project.addResourceType(new Model.ResourceType(m.machineTypeId, m.typeName))
        });

        var hasTask = {}, hasTask2 = {};     
        var 
          timeParser = d3.time.format('%Y-%m-%d %H:%M'),
          tasks = [],
          setup = {}
        ;
        
        if(project.regardChangeoverAsTask) {
          tasks = json.Schedule;
        } else {
          json.Schedule.filter(function(t){return t.setupTime == 0;}).forEach(function(t){
            tasks.push(t);
          });
          json.Schedule.filter(function(t){return t.setupTime > 0;}).forEach(function(t){
            setup[t.id] = t.setupTime;
          });
        }
        
        tasks.forEach(function(task){
          hasTask[task.machineId] = true; 
          hasTask2[task.operationTypeId] = true;
        })

        json.Machines.forEach(function(m){
          if(hasTask[m.machineId])
            project.addResource(new Model.Resource(m.machineId, m.machineTypeId, m.machineNumber, project));
        });

        json.JobTypes.forEach(function(m){
          project.addPackage(new Model.Package(m.jobTypeId, m.typeName, false));
        });
        // add setup task type
        project.addPackage(new Model.Package(project.setupPackageId, 'Ch', true));
        
        json.OperationTypes.sort(function(a,b){return a.id - b.id;}).forEach(function(m){
//          console.log(hasTask2[m.nextTaskDefinition]);
          if(hasTask2[m.operationTypeId]){
            project.addTaskDefinition(
              new Model.TaskDefinition(
                m.operationTypeId, 
                m.jobTypeId, 
                m.machineTypeId, 
                m.degree, 
                m.prevOperationTypeId || null, 
                (m.nextOperationTypeId && hasTask2[m.nextTaskDefinition]) ? m.nextTaskDefinition : null, 
                false,
                project
             ));
          }
        });
        
        // add setup task definition
        project.addTaskDefinition(
          new Model.TaskDefinition(
            project.setupTaskDefinitionId,
            project.setupPackageId,
            null,
            1,
            null,
            null,
            true,
            project
          )
        )
 

        tasks.forEach(function(m){
          var resource = project.findResourceById(m.machineId),
              startAtTime = timeParser.parse(m.startAt).getTime() + (project.regardChangeoverAsTask ? 0 : - (setup[m.id] || 0) * 60 * 1000);
          if(m.setupTime > 0 && project.regardChangeoverAsTask) {
            project.addTask(new Model.Task(
              project.setupTaskId++,
              project.setupTaskDefinitionId,
              resource.id,
              new Date(startAtTime),
              timeParser.parse(m.endAt),
              m.setupTime,
              project
            ));
          } else {
            project.addTask(new Model.Task(
              m.operationId,
              project.findTaskDefinitionById(m.operationTypeId).id,
              resource.id,
              new Date(startAtTime),
              timeParser.parse(m.endAt),
              !project.regardChangeoverAsTask ? (setup[m.id] || 0) : 0,
              project
            ));
          }
        });
        project.initialize(json);
        onSuccess(project);
      }
    });
  }

  return load;
});
