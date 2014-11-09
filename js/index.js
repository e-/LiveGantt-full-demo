require.config({
  baseUrl: 'js',   
  packages: ['model', 'view', 'adapter', 'backend'],
  paths: {
    jquery: 'lib/jquery',
    jqueryui: 'lib/jquery-ui-1.10.4.custom/js/jquery-ui-1.10.4.custom.min',
    d3: 'lib/d3.v3.min',
    bootstrap: 'lib/bootstrap.min',
    simplify: 'lib/simplify',
    Filter: 'Filter',
    System: 'System',
    Window: 'Window'
  },
  shim: {
    bootstrap: {
        deps: ['jquery']
    },
    jqueryui: {
        deps: ['jquery']
    }
  }
});

require(['jquery', 'model', 'view', 'Filter', 'Window', 'backend',
'd3', 'util'
], function($, Model, View, Filter, Window, Backend){
  var 
      manager
      ;

  function initialize(project){
    $('#loading').hide();
    var mainWindow = new Window(project, $('#main-window'), function(){
      manager.renderAll();
    }, true);
    var auxWindow = new Window(project, $('#aux-window'), function(){
      manager.renderAll();
    }, false);


    manager = View.Manager(
      project,
      mainWindow,
      auxWindow,
      $('#history-views'),
      {
        historyViewWidth: 200,
        historyViewHeight: 150,
        flowViewWidth: 200,
        flowViewHeight: 30
      }
    );

    var options = {
      onFiltered: function(view, filter){
        var container;
        view.editable(false);
        
        var newView = view.class()(
          view.project(),
          manager, 
          filter, 
          d3.util.cloneHash(view.options()),
          mainWindow);

        container = manager.addView(newView);
        manager.split(0);
        manager.focus(container);
        manager.renderAll();
      },
      onRescheduled: function(json, view, filter, options){
        if(manager.rescheduling) {
          var project2 = project.rescheduled(json),
              newView = View.ScheduleView(
                project2, 
                manager, 
                filter.cloneWithProject(project2), 
                d3.util.cloneHash(view.options()), 
                mainWindow),
              container = manager.getLastContainer();
          newView.rescheduled = true; 
          container.view = newView;
          manager.renderAll();          
        } else {
          manager.rescheduling = true;
          var container;
          view.editable(false);
          var project2 = project.rescheduled(json);
          var newView = View.ScheduleView(
            project2, manager, filter.cloneWithProject(project2), 
            d3.util.cloneHash(view.options()), mainWindow);
          newView.rescheduled = true;
          container = manager.addView(newView);
          var originalView = View.ScheduleView(project, manager, filter, 
          d3.util.cloneHash(view.options()), auxWindow);
          mainWindow.setContainer(container);
          auxWindow.setContainer({view: originalView});
          manager.splitted = 1;
          manager.focus(container);
          manager.renderAll();
        }
      },
      isReferenceLineVisible: true,
      aggregationLevel: 3
    }

    var filter = Filter(project);
    var initView;

    initView = View.ScheduleView(project, manager, filter, options, mainWindow);
    
    var container = manager.addView(initView);

    mainWindow.setContainer(container);
    manager.renderAll();
  }

  Backend.load(initialize, './schedule.json');
});
