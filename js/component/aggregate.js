define(['util'], function(){
  'use strict';
  var order, orderCount, orderInAggr, orderInAggrCount, recursionCount,
      groupBy = d3.util.groupBy,
      aggrTimeInterval = d3.util.hours(2)
  ;

  function getAggrIndex(time, startAt){
    return Math.floor((time - startAt) / aggrTimeInterval);
  }


/*
  function wrap(time){
    if(filteredTime[1] < time) return filteredTime[1];
    if(filteredTime[0] > time) return filteredTime[0];
    return time;
  }
*/

  function getPrevAggrIndex(time, startAt){
    return Math.floor((startAt - time) / aggrTimeInterval);
  }

  function getAggrTaskStartAtTime(r){
    return r.aggrTask.startAtTime;
  }
  function getAggrTaskEndAtTime(r){
    return r.aggrTask.endAtTime;
  }
  function getAggrTask(r){
    return r.aggrTask;
  }

  function recursiveAggregate(resources, focusAtTime, level, rootAggrTask, filteredTime){
    recursionCount ++;
    var results = [], result;
    if(resources.length == 1){
      var resource = resources[0],
          aggrTask = resource.aggrTask,
          prevResult = rootAggrTask;
      orderInAggr[resource.id] = orderInAggrCount++;
      
      while(aggrTask){
        results.push(result = {
          x1: aggrTask.startAtTime,
          x2: aggrTask.endAtTime,
          resources: resources,
          package: aggrTask.package,
          level: level,
          tasks: [aggrTask],
          next: []
        });
        prevResult.next.push(result);
        prevResult = result;
        aggrTask = aggrTask.next;
        level++;
      }
      return results;
    }
    var groups = groupBy(resources, function(r){
       return (!r.aggrTask) + 0; //r.aggrTask.finished + 0;
    });
    groups.forEach(function(group){
      if(group.key) { // 끝난 것들 
        group.values.forEach(function(r){
          orderInAggr[r.id] = orderInAggrCount++;
        });
      } else { // 있는 것들
        var groups2 = groupBy(group.values, function(r){ 
          //이제 package으로 나누자
          return r.aggrTask.package.id;
        }, function(a, b){
          return d3.min(a.values, function(r){return r.aggrTask.startAtTime;})
          - d3.min(b.values, function(r){return r.aggrTask.startAtTime;});
        });
        
        groups2.forEach(function(group2){
          //var groups3 = groupBy(group2.values, function(r){ // 다음 task의 타입으로 나누자. 없으면 무조건 아래로
          //  if(r.aggrTask.next/* && r.aggrTask.next.startAtTime < filteredTime[1]*/) {
          //    return 1//r.aggrTask.next.package.id;
          //  } else {
          //    return 1;
          //    return 999;
          //  }
          //});
          /*groups3.forEach*/(function(group3){
            var groups4 = groupBy(group3.values, function(r){
              return r.aggrTask.startAtTime < focusAtTime + 0; //r.aggrTask.focused + 0;
            }, function(a, b){return b.key - a.key;});
            groups4.forEach(function(group4){
              var minEndAt, groups5;
              
              if(group4.key) {
                minEndAt = d3.min(group4.values.map(getAggrTaskEndAtTime));
                groups5 = groupBy(group4.values, function(r){
                  return getAggrIndex(r.aggrTask.endAtTime, minEndAt);
                });
              } else {
                minEndAt = d3.min(group4.values.map(getAggrTaskStartAtTime));
                groups5 = groupBy(group4.values, function(r){
                  return getAggrIndex(r.aggrTask.startAtTime, minEndAt);
                });
              }

              groups5.forEach(function(group5){
                var 
                    endAtTime = d3.mean(group5.values.map(getAggrTaskEndAtTime))
                ;
                results.push(result = {
                  x1: (group4.key ? focusAtTime : d3.mean(group5.values.map(getAggrTaskStartAtTime))),
                  x2: endAtTime,
                  resources: group5.values,
                  tasks: group5.values.map(getAggrTask),
                  package: group5.values[0].aggrTask.package,
                  level: level,
                  next: []
                });
                rootAggrTask.next.push(result);
                
                group5.values.forEach(function(r){
                  while(1) {
                    r.aggrTask = d3.util.cloneHash(r.aggrTask.next);
                    if(!r.aggrTask)
                      break;
                    if(filteredTime[1] < r.aggrTask.startAtTime) {
                      r.aggrTask = undefined;
                      break;
                    }
//                      r.aggrTask.startAtTime = wrap(r.aggrTask.startAtTime);
//                      r.aggrTask.endAtTime = wrap(r.aggrTask.endAtTime);

                    if(r.aggrTask.startAtTime < endAtTime)
                      r.aggrTask.startAtTime = endAtTime;
                    if(endAtTime < r.aggrTask.startAtTime && r.aggrTask.startAtTime < endAtTime + aggrTimeInterval) {
                      r.aggrTask.startAtTime = endAtTime; 
                    }

                    if(r.aggrTask.startAtTime < r.aggrTask.endAtTime)
                      break;
                  }
                });

                result.child = 
                  recursiveAggregate(group5.values, endAtTime + 1, level + 1, result, filteredTime);
              });
            });
          })(group2);
        });
      }
    });
    return results;
  }

  function recursiveBackwardAggregate(resources, focusAtTime, level, filteredTime){
    //backward로 aggregation을 할 때에는 order를 지켜야 한다!!
    recursionCount ++;
    
    var
        i,
        length = resources.length,
        results = [],
        prevAggrTask,
        aggrTask,
        aggrResources = [],
        resource
    ;
    if(length == 0) return [];
    if(length == 1) {
      resource = resources[0];
      if(!resource) return [];
      aggrTask = resource.aggrTask;
      while(aggrTask){
        results.push({
          x1: aggrTask.startAtTime,
          x2: Math.min(aggrTask.endAtTime, focusAtTime),
          resources: resources,
          package: aggrTask.package,
          level: level,
          backward: true,
          tasks: [aggrTask]
        });
        aggrTask = aggrTask.prev;
        level++;
      }
      return results;
    }

    function backwardAggregate(resources){
      var startAtTime = d3.mean(resources.map(getAggrTaskStartAtTime));
      if(!resources.length) return;
      results.push({
        x1: startAtTime,
        x2: focusAtTime,
        resources: resources,
        package: resources[0].aggrTask.package,
        tasks: resources.map(getAggrTask),
        level: level,
        backward: true
      });
      resources.forEach(function(resource){
        while(1) {
          resource.aggrTask = d3.util.cloneHash(resource.aggrTask.prev);
          if(!resource.aggrTask)
            break;
          if(filteredTime[1] < resource.aggrTask.startAtTime) {
            resource.aggrTask = undefined;
            break;
          }
          resource.aggrTask.startAtTime = resource.aggrTask.startAtTime;
          resource.aggrTask.endAtTime = resource.aggrTask.endAtTime;

          if(resource.aggrTask.endAtTime > startAtTime) 
            resource.aggrTask.endAtTime = startAtTime;
          if(startAtTime > resource.aggrTask.endAtTime && resource.aggrTask.endAtTime > startAtTime - aggrTimeInterval)
            resource.aggrTask.endAtTime = startAtTime;
          if(resource.aggrTask.startAtTime < resource.aggrTask.endAtTime)
            break;
        }
      });
      results = results.concat(recursiveBackwardAggregate(resources, startAtTime - 1, level + 1, filteredTime));
    }

    for(i=0; i<length; ++i){ //순서를 지켜야함 
      resource = resources[i];
      aggrTask = resource.aggrTask;
      if(!aggrTask) {
        if(aggrResources.length > 0)
          backwardAggregate(aggrResources);
        prevAggrTask = undefined;
        aggrResources = [];
        continue;
      }
      if(!prevAggrTask) {
        prevAggrTask = aggrTask;
        aggrResources = [resource];
        continue;
      }          
      // check whether resource can be included to aggrResources
      if(prevAggrTask.startAtTime - aggrTimeInterval / 2  <= aggrTask.startAtTime && aggrTask.startAtTime < prevAggrTask.startAtTime + aggrTimeInterval / 2) {
        //if possible, added resource to aggrResources
        aggrResources.push(resource);
      } else {
        backwardAggregate(aggrResources);
        prevAggrTask = aggrTask;
        aggrResources = [resource];
      }
    }
    backwardAggregate(aggrResources);
    return results;
  }

  function recursiveAggregateFinished(resources, focusAtTime, level, filteredTime){
    recursionCount ++;
    var results = [];
    if(resources.length == 1){
      var resource = resources[0],
          aggrTask = resource.aggrTask;

      order[resource.id] = orderCount++;
      
      while(aggrTask){
        results.push({
          x1: aggrTask.startAtTime,
          x2: aggrTask.endAtTime,
          resources: resources,
          package: aggrTask.package,
          level: level,
          backward: true,
          finished: true,
          tasks: [aggrTask]
        });
        aggrTask = aggrTask.prev;
        level++;
      }
      return results;
    }
    var groups = groupBy(resources, function(r){
       return (!r.aggrTask) + 0; //r.aggrTask.finished + 0;
    });
    groups.forEach(function(group){
      if(group.key){
        group.values.forEach(function(r){
          order[r.id] = orderCount++;
        });
      } else { 
        var groups2 = groupBy(group.values, function(r){ 
          //이제 package으로 나누자
          return r.aggrTask.package.id;
        });
        groups2.forEach(function(group2){
          /*var groups3 = groupBy(group2.values, function(r){ // 다음 task의 타입으로 나누자. 없으면 무조건 아래로
            if(r.aggrTask.prev) {
              return 1;
              return r.aggrTask.prev.package.id;
            } else {
              return 1;
              return 999;
            }
          });*/
          /*groups3.forEach*/(function(group3){
            var groups4 = groupBy(group3.values, function(r){
              return r.aggrTask.endAtTime > focusAtTime + 0; //r.aggrTask.focused + 0;
            });
            groups4.forEach(function(group4){
              //(시작 시간으로 aggregation)
              var minStartAt = d3.max(group4.values.map(getAggrTaskStartAtTime))

              var groups5 = groupBy(group4.values, function(r){
                return getPrevAggrIndex(r.aggrTask.startAtTime, minStartAt);
              });

              groups5.forEach(function(group5){
                var 
                    startAtTime = d3.mean(group5.values.map(getAggrTaskStartAtTime)),
                    result,
                    x1 = startAtTime,
                    x2 = group4.key ? focusAtTime : d3.mean(group5.values.map(getAggrTaskEndAtTime))
                ;
                results.push(result = {
                  x1: x1,
                  x2: Math.max(x1, x2),
                  resources: group5.values,
                  tasks: group5.values.map(getAggrTask),
                  package: group5.values[0].aggrTask.package,
                  level: level,
                  backward: true, finished:true
                });
                
                group5.values.forEach(function(r){
                  while(1) {
                    r.aggrTask = d3.util.cloneHash(r.aggrTask.prev);
                    if(!r.aggrTask)
                      break;
                    if(r.aggrTask.endAtTime < startAtTime)
                      r.aggrTask.endAtTime = startAtTime;
                    if(startAtTime > r.aggrTask.endAtTime && r.aggrTask.endAtTime > startAtTime - aggrTimeInterval) {
                      r.aggrTask.endAtTime = startAtTime; 
                    }

                    if(r.aggrTask.startAtTime < r.aggrTask.endAtTime)
                      break;
                  }
                });
                result.child = 
                  recursiveAggregateFinished(group5.values, startAtTime - 1, level + 1, filteredTime);
              });
            });
          })(group2);
        });
      }
    });
    return results;
  }
  
  function aggregate(filteredResources, filteredResourceTypes, focusAtTime, filteredTime){
    var aggregated = [];
    order = {};
    orderCount = 1;
    recursionCount = 0;
    orderInAggr = {};
    orderInAggrCount = 1;
    
    //d3.util.timer.start('aggregate');
    filteredResourceTypes.forEach(function(resourceType){
      var 
          resources = filteredResources.filter(function(r){return r.resourceType == resourceType;}),
          results
      ;
      if(resources.length == 0) {
        return;
      }

      var progressResources = resources.filter(function(r){
        return !r.getAggrTask(focusAtTime).finished;
      });
      progressResources.forEach(function(r){
        r.aggrTask = r.getAggrTask(focusAtTime).task;
/*          if(r.aggrTask) {
          r.aggrTask.startAtTime = wrap(r.aggrTask.startAtTime);
          r.aggrTask.endAtTime = wrap(r.aggrTask.endAtTime);
        }*/
      });
      results = recursiveAggregate(progressResources, focusAtTime, 0, {next: []}, filteredTime);
      // Aggr 으로 정렬
/*      results.sort(function(a, b){
        if(a.package.id == b.package.id) {
          if(a.x1 == b.x1)
            return a.x2 - b.x2;
          return a.x1 - b.x1;
        }
        return a.package.id - b.package.id;
      }); */
      results.forEach(function(result){
        //Aggr 안에서는 순서를 재귀로 찾은대로
        result.resources.sort(function(a,b){return orderInAggr[a.id] - orderInAggr[b.id];}).forEach(function(r){
          order[r.id] = orderCount++;
        });
        result.resources.forEach(function(resource){
          resource.aggrTask = d3.util.cloneHash(resource.getPrevAggrTask(focusAtTime).task);
/*            if(resource.aggrTask) {
            resource.aggrTask.startAtTime = wrap(resource.aggrTask.startAtTime);
            resource.aggrTask.endAtTime = wrap(resource.aggrTask.endAtTime);
          }*/
        });
        var backwardAggregated =
          recursiveBackwardAggregate(result.resources, focusAtTime, 0, filteredTime);
        aggregated = aggregated.concat(backwardAggregated);
      });
      aggregated = aggregated.concat(d3.util.flatten(results));

      //없는 애들에 대해서는 backwardClustering을 한번 더해야한다. 그리고 걔들로 묶어야함.
      var 
          finishedResources = resources.filter(function(r){return !order[r.id];});
      finishedResources.forEach(function(resource){resource.aggrTask = d3.util.cloneHash(resource.getPrevAggrTask(focusAtTime).task);});
      results = recursiveAggregateFinished(finishedResources, focusAtTime, 0, filteredTime);

      aggregated = aggregated.concat(d3.util.flatten(results));
    });
    //d3.util.timer.end('aggregate');
    return [aggregated, order];
  }
  return aggregate;
});
