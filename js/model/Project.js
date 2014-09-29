define(['model/Resource', 'model/Task', 'model/Package', 'model/TaskDefinition',
'd3', 'util'], function(Resource, Task, Package, TaskDefinition){
  function Project(name)
  {
    this.name = name;
    
    this.resourceTypes = [];
    this.resources = [];
    this.packages = [];
    this.taskDefinitions = [];
    this.tasks = [];

    this.resourceTypeById = {};
    this.resourceById = {};
    this.packageById = {};
    this.taskDefinitionById = {};
    this.taskById = {};

    this.packageColors = d3.scale.category20().domain(d3.range(20));
    this.unitTimeInterval = d3.util.minutes(10);
    this.progressAggrCount = 6;
    this.setupPackageId = 100;
    this.setupPackageColor = d3.rgb(96, 96, 96);
    this.setupTaskDefinitionId = 1000;
    this.setupTaskId = 10000;
    this.regardChangeoverAsTask = true;

    this.aggrTimeIntervals = [
      [d3.util.days(1.5), d3.util.minutes(10)],
      [d3.util.days(5), d3.util.minutes(30)],
      [d3.util.days(10), d3.util.hours(1)],
      [d3.util.days(999), d3.util.hours(4)]
    ];
  }

  Project.prototype = {
    addResourceType: function(resourceType){
      this.resourceTypes.push(resourceType);
      this.resourceTypeById[resourceType.id] = resourceType;
    },
    addResource: function(resource){
      this.resources.push(resource);
      this.resourceById[resource.id] = resource;
     
      this.resourceTypeById[resource.resourceTypeId].addResource(resource);
    },
    addPackage: function(package){
      package.color = d3.rgb(this.packageColors(this.packages.length % 10)).brighter(0.5);
      this.packages.push(package);
      this.packageById[package.id] = package;
    },
    addTaskDefinition: function(taskDefinition){
      this.taskDefinitions.push(taskDefinition);
      this.taskDefinitionById[taskDefinition.id] = taskDefinition;
      this.packageById[taskDefinition.packageId].addTaskDefinition(taskDefinition);
    },
    addTask: function(task){
      this.tasks.push(task);
      this.taskById[task.id] = task;
      this.resourceById[task.resourceId].addTask(task);
      this.packageById[task.taskDefinition.packageId].addTask(task);
      this.taskDefinitionById[task.taskDefinitionId].addTask(task);
    },
    findResourceByName: function(name){
      var result = null;
      this.resources.forEach(function(resource){
        if(resource.getName() === name) {
          result = resource;
          return false;
        }
      });
      return result;
    },
    findResourceById: function(id){
      return this.resourceById[id];
    },
    findPackageByName: function(name){
      var result = null;
      this.packages.forEach(function(package){
        if(package.name === name){
          result = package;
          return false;
        }
      });
      return result;
    },
    findPackageById: function(id){
      return this.packageById[id];
    },
    findTaskDefinition: function(packageId, resourceTypeId, degree){
      var result = null;
      this.taskDefinitions.forEach(function(taskDefinition){
        if(taskDefinition.packageId === packageId && taskDefinition.resourceTypeId == resourceTypeId && taskDefinition.degree === degree){
          result = taskDefinition;
          return false;
        }
      });
      return result;
    },
    findTaskDefinitionById: function(id){
      return this.taskDefinitionById[id];
    },
    getStartAt: function(){
      var startAt = this.tasks[0].startAt;
      this.tasks.forEach(function(task){
        if(startAt > task.startAt)
          startAt = task.startAt;
      });
      return startAt;
    },
    getEndAt: function(){
      var endAt = this.tasks[0].endAt;
      this.tasks.forEach(function(task){
        if(endAt < task.endAt)
          endAt = task.endAt;
      });
      return endAt;
    },
    initialize: function(json){

      d3.util.timer.start('initialize');
      this.initializeConstants();
      this.initializeTaskDefinitions();
      this.initializePackageColors();
      this.initializeTaskDefinitionColors();
      this.initializeTasks();
      this.initializeAggrTasksByPackage();
      this.initializeResourceProgress();
      this.initializeResources();
      this.initializePackageProgress();
      this.initializeTaskDefinitionStock();
      this.initializeUtilization();
      this.initializeSetup();
      this.initializeFrequency();
      this.initializeStat(json);
      d3.util.timer.end('initialize');
    },
    initializeTaskDefinitions: function(){
      var self = this;
      this.taskDefinitions.forEach(function(taskDefinition){
        if(taskDefinition.prevTaskDefinitionId)
          taskDefinition.prevTaskDefinition = self.taskDefinitionById[taskDefinition.prevTaskDefinitionId];
        else
          taskDefinition.prevTaskDefinition = undefined;

        if(taskDefinition.nextTaskDefinitionId)
          taskDefinition.nextTaskDefinition = self.taskDefinitionById[taskDefinition.nextTaskDefinitionId];
        else
          taskDefinition.nextTaskDefinition = undefined;
      });

    },
    initializeAggrTasksByPackage: function(){
      var
          self = this;

      function createAggrTaskFromTask(task, resource){
        return {
          startAtTime: task.startAtTime,
          endAtTime: task.endAtTime,
          package: task.package,
          resourceType: resource.resourceType,
          resource: resource,
          tasks: [task]
        };
      }

      self.resources.forEach(function(resource){
        var prevTask;
        resource.aggrTasksByPackage = [];
        resource.tasks.forEach(function(task){
          if(!prevTask) 
            prevTask = createAggrTaskFromTask(task, resource);
          else {
            if(prevTask.endAtTime === task.startAtTime && prevTask.package === task.package){
              prevTask.tasks.push(task);
              prevTask.endAtTime = task.endAtTime;              
            } else {
              resource.aggrTasksByPackage.push(prevTask);
              prevTask = createAggrTaskFromTask(task, resource);
            }
          }
          ;
        });
        resource.aggrTasksByPackage.push(prevTask);

        var prevAggrTask;
        resource.aggrTasksByPackage.forEach(function(aggrTask){
          if(prevAggrTask) {
            prevAggrTask.next = aggrTask;
            aggrTask.prev = prevAggrTask;
          }
          prevAggrTask = aggrTask;
        });
      });
    },
    initializePackageColors: function(){
      var c = [
        [0, 102, 255],
        [153, 102, 255],
        [255, 102, 255],
        [255, 80, 80],
        [255, 153, 51],
        [255, 255, 102],
        [153, 255, 51],
        [0, 255, 153],
        [0, 255, 255]
      ]
      var 
          self = this,
          count = {},
          arr = [],
          categoryColors = d3.scale.category20().domain(d3.range(20)),
          c1 = [],
          c2 = [];

      d3.range(20).forEach(function(i){
        if(i%2) c2.push(categoryColors(i));
        else c1.push(categoryColors(i));
      });
      
      var colors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#bcbd22", "#17becf", "#aec7e8", "#ffbb78", "#98df8a", "#ff9896", "#c5b0d5", "#c49c94", "#f7b6d2", "#dbdb8d", "#9edae5"] ;

c = ["#8dd3c7",
"#ffffb3",
"#bebada",
"#fb8072",
"#80b1d3",
"#fdb462",
"#b3de69",
"#fccde5",
"#d9d9d9",
"#bc80bd"];
      
//      colors = colors.map(function(c){return d3.rgb(c).brighter(1.5);});
//      colors = c.map(function(q){return d3.rgb(q);});

      //colors = [d3.rgb(255, 174, 31), d3.rgb(188,244,64), d3.rgb(72,152,249), d3.rgb(244,112,81), d3.rgb(140,224,193), d3.rgb(213,147,229), d3.rgb(77,91,119), d3.rgb(242,238,92)];
      
      this.tasks.forEach(function(task){
        var packageId = task.taskDefinition.packageId;
        if(!count[packageId])
          count[packageId] = 0;
        count[packageId]++;
      });
      Object.keys(count).forEach(function(packageId){
        if(packageId != self.setupPackageId)
          arr.push([packageId, count[packageId]]);
      });
      arr = arr.sort(function(a,b){return b[1] - a[1];});
      //console.log(arr);

      arr.forEach(function(sorted, index){
        self.packageById[sorted[0]].color = colors[index % 18];
      });
      self.packageById[self.setupPackageId].color = self.setupPackageColor;
    },
    initializeTaskDefinitionColors: function(){
      var self = this;
      self.packages.forEach(function(package){
        var 
            color = package.color,
            length = package.taskDefinitions.length,
            rgb = d3.rgb(color),
            hsl = rgb.hsl(),
            ds = hsl.s / length,
            lRange = 0.6,
            maxL = Math.max(0.8, hsl.l),
            minL = maxL - lRange,
            dl = lRange / length,
            h = hsl.h,
            s = hsl.s,
            l = maxL
        ;

        package.taskDefinitions.forEach(function(taskDefinition){
          taskDefinition.color = d3.hsl(h, s, l);
          l -= dl;
        });
        package.darkColor = d3.hsl(h, s, l);
      });
    },
    initializeConstants: function(){
      this.dimension = Math.floor((this.getEndAt() - this.getStartAt()) / this.unitTimeInterval) + 1;
      this.startAt = this.getStartAt();
      this.endAt = this.getEndAt();
      this.startAtTime = this.startAt.getTime();
      this.endAtTime = this.endAt.getTime();
    },
    initializePackageProgress: function(){
      var
          self = this,
          i;
      
      this.packages.forEach(function(package){
        var progress = new Array(self.dimension);
        package.progress = progress;
        package.progressZipped = [];
        for(i=0;i<self.dimension;++i) progress[i] = 0;
      });

      this.tasks.forEach(function(task){
        var 
            package = task.package;
        if(!task.taskDefinition.nextTaskDefinitionId)
          package.progress[self.getIndex(task.endAtTime)]++;
      });
      
      this.packages.forEach(function(package){
        for(i=1;i<self.dimension;++i)
          package.progress[i] += package.progress[i-1];
        
        package.count = package.progress[self.dimension - 1];
        for(i=0;i<self.dimension;++i)
          package.progress[i] = {
            x: self.getTimeFromIndex(i),
            number: package.progress[i],
            percent: d3.util.decimalFormat(package.progress[i] / package.count * 100, 1)
          }
        var prev = package.progress[0];
        for(i=1;i<self.dimension;++i) {
          var p = package.progress[i];
          if(prev.number != p.number) {
            var c = d3.util.cloneHash(prev);
            c.x = p.x;
            package.progressZipped.push(prev);
            package.progressZipped.push(c);
            prev = p;
          }
        }
        var c = d3.util.cloneHash(prev);
        c.x = self.getTimeFromIndex(i-1);
        package.progressZipped.push(prev);
        package.progressZipped.push(c);

        var d = [0], i, c = self.progressAggrCount;
        for(i=c;i<self.dimension;i+=c){
          d.push(package.progress[i].number - package.progress[i-c].number);
        }
        package.deltaProgress = d;
        package.minDeltaProgress = d3.min(d);
        package.maxDeltaProgress = d3.max(d);
      });
    },
    initializeTaskDefinitionStock: function(){
      var
          self = this,
          i;
      
      this.taskDefinitions.forEach(function(taskDefinition){
        var stock = new Array(self.dimension);
        taskDefinition.stock = stock;
        taskDefinition.stockZipped = [];
        for(i=0;i<self.dimension;++i) stock[i] = 0;
      });

      this.tasks.forEach(function(task){
        var 
            taskDefinition = task.taskDefinition;
          if(taskDefinition.prevTaskDefinitionId)  {
            self.taskDefinitionById[task.taskDefinition.prevTaskDefinitionId].stock[self.getIndex(task.setupAtTime)]--;
          }
        task.taskDefinition.stock[self.getIndex(task.endAtTime)]++;
      });
      
      this.taskDefinitions.forEach(function(taskDefinition){
        for(i=1;i<self.dimension;++i)
          taskDefinition.stock[i] += taskDefinition.stock[i-1];

        for(i=0;i<self.dimension;++i)
          taskDefinition.stock[i] = {
            x: self.getTimeFromIndex(i), 
            number: taskDefinition.stock[i],
            percent: d3.util.decimalFormat(
            Math.min(taskDefinition.stock[i] / taskDefinition.package.count * 100, 100)
            , 1)
          }
        var prev = taskDefinition.stock[0];
        for(i=1;i<self.dimension;++i) {
          var p = taskDefinition.stock[i];
          if(prev.number != p.number) {
            var c = d3.util.cloneHash(prev);
            c.x = p.x;
            taskDefinition.stockZipped.push(prev);
            taskDefinition.stockZipped.push(c);
            prev = p;
          }
        }
        var c = d3.util.cloneHash(prev);
        c.x = self.getTimeFromIndex(i-1);
        taskDefinition.stockZipped.push(prev);
        taskDefinition.stockZipped.push(c);

        var d = [0], i, c = self.progressAggrCount;
        for(i=c;i<self.dimension;i+=c){
          d.push(taskDefinition.stock[i].number - taskDefinition.stock[i-c].number);
        }
        taskDefinition.deltaStock = d;
        taskDefinition.minDeltaStock = d3.min(d);
        taskDefinition.maxDeltaStock = d3.max(d);
      });
    },
    initializeResourceProgress: function(){
      var
          self = this,
          i
      ;
      this.resources.forEach(function(resource){
        var progress = new Array(self.dimension);
        resource.proress = progress;

        for(i=0;i<self.dimension;++i) progress[i] = 0;

        resource.tasks.forEach(function(task){
          progress[(task.endAtTime - self.startAtTime) / self.unitTimeInterval] ++;
        });

        for(i=1;i<self.dimension;++i)
          progress[i] += progress[i-1];
        
        resource.count = progress[self.dimension - 1];

        for(i=0;i<self.dimension;++i){
          progress[i] = {
            number: progress[i],
            percent: d3.util.decimalFormat(progress[i] / resource.count * 100, 1)
          }
        }
      });
    },
    initializeResources: function(){
      var
          self = this
      ;

      this.resources.forEach(function(resource){
        var sum = 0, setupTime = 0;
        resource.tasks.forEach(function(task){
          sum += task.endAtTime - task.startAtTime;
          setupTime += task.setup;
        });
        resource.utilization = sum / (self.endAtTime - self.startAtTime);
        resource.setupTime = setupTime;
        resource.startAtTime = resource.tasks[0].startAtTime;
        resource.endAtTime = resource.tasks[resource.tasks.length - 1].endAtTime;
        resource.startAt = new Date(resource.startAtTime);
        resource.endAt = new Date(resource.endAtTime);
      });
    },
    initializeTasks: function(){
      var
          self = this,
          prevTask;

      this.resources.forEach(function(resource){
        prevTask = null;
        resource.tasks.forEach(function(task){
          if(prevTask) {
            prevTask.next = task;
            task.prev = prevTask;
          }
          
          prevTask = task;
        });
      });
    },
    initializeUtilization: function(){
      var
          self = this,
          i,
          utilization
      ;

      self.utilization = utilization = new Array(self.dimension);

      d3.util.memset(utilization, 0);

      self.tasks.forEach(function(task){
        var
            startIndex = self.getIndex(task.setupAtTime),
            endIndex = self.getIndex(task.endAtTime)
        ;
        for(i=startIndex; i<endIndex;++i)
          utilization[i]++;
      });

      for(i=0;i<self.dimension;++i)
        utilization[i] = {
          x: i * self.unitTimeInterval + self.startAtTime,
          y: d3.util.decimalFormat(utilization[i] / self.resources.length * 100, 1)
        };
    },
    initializeSetup: function(){
      var
          self = this,
          i,
          setup
      ;

      self.setup = setup = new Array(self.dimension);
      d3.util.memset(setup, 0);

      self.tasks.forEach(function(task){
        if(task.setup > 0) {
          var 
              startIndex = self.getIndex(task.startAtTime),
              endIndex = self.getIndex(task.setupAtTime)
          ;
          for(i=startIndex;i<endIndex;++i)
            setup[i]++;
        }
      });
      
      for(i=0;i<self.dimension;++i)
        setup[i] = {
          x1: i * self.unitTimeInterval + self.startAtTime,
          x2: (i+1) * self.unitTimeInterval + self.startAtTime,
          y: setup[i]
        };

      self.aggrSetup = [];

      self.aggrTimeIntervals.forEach(function(interval, index){
        self.aggrSetup[index] = [];
        var unit = interval[1] / self.unitTimeInterval;
        for(i=0;i<self.dimension;i+=unit){
          var aggr = {
            x1: setup[i].x1,
            y: setup[i].y
          };
          for(var j=i;j<i+unit;++j){
            if(setup[j]){
              aggr.x2 = setup[j].x2;
              aggr.y = Math.max(aggr.y, setup[j].y);
            }
          }
          self.aggrSetup[index].push(aggr);
        }
      });
    },
    getIndex: function(time, interval){
      if(!interval)
        interval = this.unitTimeInterval;
      
      return Math.floor((time - this.startAtTime) / interval);
    },
    getTimeFromIndex: function(index, interval){
      if(!interval)
        interval = this.unitTimeInterval;
      return index * interval + this.startAtTime;
    },
    getAggrTimeInterval: function(timeInterval) {
      var i;
      for(i=0; i<this.aggrTimeIntervals.length; ++i) 
        if(timeInterval < this.aggrTimeIntervals[i][0])
          return this.aggrTimeIntervals[i][1];
    },
    getAggrTimeIndex: function(timeInterval) {
      var i;
      for(i=0; i<this.aggrTimeIntervals.length; ++i) 
        if(timeInterval < this.aggrTimeIntervals[i][0])
          return i;
    },
    initializeFrequency: function(){
      var
          self = this,
          i,
          frequency
      ;

      function normalize(v){
        var min = 0, max = d3.max(v), interval = max - min;
        v.forEach(function(e, i){
          v[i] = {
            raw: e,
            normalized: interval == 0 ? 0 : (e - min) / interval,
            classed: interval == 0 ? 0 :(
              e == max ? 3 : (
                e == 0 ? 0 : (
                  Math.ceil((e-min) / interval * 2)
                )
              )
            )
          }
        });
      }

      function getRLEElement(startIndex, endIndex, value) {
        if(value == 0) return;
        return {
          startAtTime: startIndex * self.unitTimeInterval + self.startAtTime,
          endAtTime: endIndex * self.unitTimeInterval + self.startAtTime,
          value: value
        };
      }
      
      function RLE(frequency) {
        var 
            result = [],
            prevClass,
            runStartIndex
        ;

        frequency.forEach(function(f, index){
          if(f.classed != prevClass) {
            if(prevClass != undefined && prevClass > 0) {
              result.push(getRLEElement(runStartIndex, index, prevClass));
            }
            prevClass = f.classed;
            runStartIndex = index;
          }
        });
        if(prevClass > 0)
          result.push(getRLEElement(runStartIndex, frequency.length, prevClass));

        return result;
      }

      self.taskDefinitions.forEach(function(taskDefinition){
        taskDefinition.frequency = frequency = new Array(self.dimension);
        d3.util.memset(frequency, 0);

        self.tasks.filter(function(task){
          return task.taskDefinitionId === taskDefinition.id;
        }).forEach(function(task){
          var
              startIndex = self.getIndex(task.startAt),
              endIndex = self.getIndex(task.endAt)
          ;

          for(i=startIndex; i<=endIndex; ++i)
            frequency[i] += 1;
        });
      });

      self.packages.forEach(function(package){
        package.frequency = frequency = new Array(self.dimension);
        d3.util.memset(frequency, 0);


        package.taskDefinitions.forEach(function(taskDefinition){
          taskDefinition.frequency.forEach(function(f, index){
            frequency[index] += f;
          });
        });
      });
      
      self.taskDefinitions.forEach(function(taskDefinition){
        normalize(taskDefinition.frequency);
        taskDefinition.frequency = RLE(taskDefinition.frequency);
        taskDefinition.frequency.forEach(function(f){
          f.taskDefinition = taskDefinition;
        });
      });

      self.packages.forEach(function(package){
        normalize(package.frequency);
        package.frequency = RLE(package.frequency);
        package.frequency.forEach(function(f){
          f.package = package;
        });
      });
    },
    rescheduled: function(json){
      var 
          self = this,
          project = new Project('abc');
      
      project.json = json;
      self.resourceTypes.forEach(function(resourceType){
        project.addResourceType(resourceType.clone());
      });
      var hasTask = {}, hasTask2 = {};
      var 
          timeParser = d3.time.format('%Y-%m-%d %H:%M'),
          tasks = [],
          setup = {}
        ;

/*      json.Tasks.filter(function(t){return t.setupTime == 0;}).forEach(function(t){
        tasks.push(t);
      });*/

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
      
      self.resources.forEach(function(m){
        if(hasTask[m.id])
          project.addResource(new Resource(m.id, m.resourceTypeId, m.number, project));
      });

      self.packages.forEach(function(m){
        project.addPackage(new Package(m.id, m.name, m.isSetup));
      });
      
      self.taskDefinitions.sort(function(a,b){return a.id - b.id;}).forEach(function(m){
        if(hasTask2[m.id])
          project.addTaskDefinition(new TaskDefinition(m.id, m.packageId, m.resourceTypeId, m.degree, 
          m.prevTaskDefinitionId || null, 
          (m.nextTaskDefinitionId && hasTask2[m.nextTaskDefinitionId]) ? m.nextTaskDefinitionId : null, 
          false,
          project));
      });

      project.addTaskDefinition(
          new TaskDefinition(
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
            project.addTask(new Task(
              project.setupTaskId++,
              project.setupTaskDefinitionId,
              resource.id,
              new Date(startAtTime),
              timeParser.parse(m.endAt),
              m.setupTime,
              project
            ));
          } else {
            project.addTask(new Task(
              m.operationId,
              project.findTaskDefinitionById(m.operationTypeId).id,
              resource.id,
              new Date(startAtTime),
              timeParser.parse(m.endAt),
              !project.regardChangeoverAsTask ? (setup[m.id] || 0) : 0,
              project
            ));
          }
/*
            startAtTime = timeParser.parse(m.startAt).getTime(); // - (setup[m.id] || 0) * 60 * 1000;
        if(m.setupTime > 0) {
          project.addTask(new Task(
            project.setupTaskId++,
            project.setupTaskDefinitionId,
            resource.id,
            new Date(startAtTime),
            timeParser.parse(m.endAt),
            m.setupTime,
            project
          ));
        } else {
          project.addTask(new Task(
            m.id,
            project.findTaskDefinitionById(m.taskDefinitionId).id,
            resource.id,
            new Date(startAtTime),
            timeParser.parse(m.endAt),
              (setup[m.id] || 0)  0,
            project
          ));*/
  /*      project.addTask(new Task(
          m.id,
          project.findTaskDefinitionById(m.taskDefinitionId).id,
          resource.id,
          new Date(startAtTime),
          timeParser.parse(m.endAt),
          setup[m.id] || 0,
          project
        ));*/
      });
      
      /*console.log('inited', project.resources.map(function(r){
        return r.id + '=' + r.tasks.filter(function(r){return r.setup == 0;}).length;
      }));*/
      project.initialize(json);
      /*console.log('inited2', project.resources.map(function(r){
        return r.id + '=' + r.tasks.filter(function(r){return r.setup == 0;}).length;
      }));*/
      return project;
    },
    initializeStat: function(json){
      this.stat = {};
      this.stat.utilization = json.util;
      this.stat.makespan = json.makespan;
    }
  };

  return Project;
});

