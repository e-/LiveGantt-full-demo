define(['jquery', 'adapter',
'd3', 'component/Flow'], function($, Adapter){
  function Manager(project, mainWindow, auxWindow, historyViews, options){
    var 
        $main = $('#main')
    ;

    function $$(svg){
      return $(svg[0][0]);
    }

    function createSvg(parent, width, height) {
      return d3.select(parent).append('svg').attr('class', 'thumbview').attr('width', width).attr('height', height);
    }

    
    function Container(view, manager){
      this.view = view;
      this.manager = manager;
    }

    Container.prototype = {
      render: function(svg, width, height, focused){
        var
            self = this,
            view = self.view;
       
        svg.select('g').remove();
        svg.select('defs').remove();
        
        var defs = svg.append('defs');
        view
          .width(width)
          .height(height)
          (svg.append('g'), focused, svg, 'e' + new Date().getTime(), false, defs);
        
        if(self.prev && !focused) {
          self.flowView.selectAll('g').remove();
          self.flowView.selectAll('defs').remove();
          self.flowView.on('mouseover', null).on('mouseout', null);
          self.flow = d3.svg.flow(self.prev.view, self.view);
          self.flow
            .height(parseInt(self.flowView.attr('height')))
            .width(parseInt(self.flowView.attr('width')))
            (self.flowView.append('g'), self.flowView)
        }
      },
      createHistoryView: function(removable){
        var self = this;
        self.$div = $('<div>').appendTo(historyViews).addClass('view-thumbnail').hide();
        if(removable) {
          self.$remove = $('<a>')
            .addClass('remove glyphicon glyphicon-remove')
            .appendTo(self.$div)
            .click(function(e){
              e.stopPropagation();
              self.manager.removeContainer(self);
            })
          ;
        }
        
        $('<span>')
          .addClass('eye glyphicon glyphicon-eye-open')
          .appendTo(self.$div)
        ;

        if(this.prev) {
          self.flowView = 
            d3.select(self.$div[0])
              .append('svg')
              .attr('class', 'flow')
              .attr('width', options.flowViewWidth)
              .attr('height', options.flowViewHeight)
          ;
        }

        self.historyView = createSvg(self.$div[0], options.historyViewWidth, options.historyViewHeight);

        self.$div.click(function(){
          self.manager.focus(self);
          self.manager.renderAll();
        });
      }
    };

    function manager(){
    }
   
    mainWindow.manager = manager;
    auxWindow.manager = manager;
    manager.containers = [];
    manager.focusedContainer = undefined;
    manager.splitted = null;
    
    manager.addView = function(view){
      var container = new Container(view, manager);

      if(!manager.containers.length) {
        manager.containers.push(container);
        container.prev = undefined;
        container.next = undefined;
      } else {
        var 
            length = manager.containers.length,
            last = manager.containers[length - 1]
        ;
        last.next = container;
        container.prev = last;
        manager.containers.push(container);
      }
      
      container.createHistoryView(manager.containers.length > 1);
      container.$div.show();
      
      if(!manager.focusedContainer)
        manager.focus(container);

      return container;
    }
    
    manager.getLastContainer = function(){
      var length = this.containers.length;
      return this.containers[length - 1];
    }

    manager.removeContainer = function(container){
      container.$div.remove();
      Array.remove(this.containers, container);
      manager.splitted = 0;
      
      var last = manager.getLastContainer();
      
      if(manager.focusedContainer == container) {
        manager.focus(last);
      }

      last.view.editable(true);
      manager.renderAll();
    }

    manager.renderAll = function(){
      var lastFocused = mainWindow.container === manager.getLastContainer();

      //window resizing
      if(lastFocused) {
        if(!manager.splitted) {
          mainWindow
            .setHeight($main.height())
            .setWidth($main.width())
            .layout()
          ;
        } else if(manager.splitted == 1) { // vertical
          mainWindow
            .setHeight($main.height())
            .setWidth($main.width() / 2)
            .layout();
          auxWindow
            .setHeight($main.height())
            .setWidth($main.width() / 2)
            .layout();
        } else { //horizontal
          mainWindow
            .setHeight($main.height() / 2)
            .setWidth($main.width())
            .layout();
          auxWindow
            .setHeight($main.height() / 2)
            .setWidth($main.width())
            .layout();
        }
      } else {
        mainWindow.setHeight($main.height()).setWidth($main.width()).layout();  
      }
       
      //render all thumbnails
      manager.containers.forEach(function(container){
        container.render(container.historyView, options.historyViewWidth, options.historyViewHeight);
      });
      mainWindow.render(mainWindow.container == manager.getLastContainer(), manager.splitted);
      if(lastFocused && manager.splitted > 0) {
        auxWindow.render(true);
      }
    }

    manager.split = function(dir) {
      manager.splitted = dir;
      auxWindow.setContainer(
        {view: mainWindow.container.view.class()(
          project, manager, mainWindow.container.view.filter().cloneWithProject(project), mainWindow.container.view.options(), auxWindow
        )}
      );
    }

    manager.focus = function(container) {
      if(manager.focusedContainer) {
        manager.focusedContainer.$div.removeClass('focused');
      }
      manager.focusedContainer = container;
      container.$div.addClass('focused');
      mainWindow.container = container;
    }

    manager.handleEvent = function(type, args, from){
      if(!manager.splitted) return;
      var others = (from == mainWindow ? auxWindow : mainWindow);
      switch(type){
        case 'focusAt': 
          others.fireEvent('focusAt', args, from.container.view.type() == 'ScheduleView' && others.container.view.type() == 'PackageView');
          break;
      }
    }

    return manager;
  }
  
  return Manager;
});
