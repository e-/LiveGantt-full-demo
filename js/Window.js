define(['view', 'adapter', 
'util', 'jquery', 'jqueryui'], function(View, Adapter){
  var viewToClass = {
    'PerformanceView': '.show-utilization-overview',
    'PackageView': '.show-tasktype-overview',
    'ScheduleView': '.show-task-overview',
    'RescheduleView': '.show-reschedule-overview',
    'ResourceView': '.show-resource-overview'
  };

  function Window(project, $root, renderAll, isMain){
    this.project = project;
    this.$root = $root;
    this.renderAll = renderAll;
    this.svg = d3.select($root.find('.main-view')[0]);
    this.$panel = $root.find('.panel');
    this.isMain = isMain;
    this.initializeUI();
    var self = this;
    this.adapters = 
    {
      'PerformanceView': Adapter.PerformanceViewAdapter($root),
      'PackageView': Adapter.PackageViewAdapter($root),
      'ScheduleView': Adapter.ScheduleViewAdapter($root, renderAll),
      'RescheduleView': Adapter.RescheduleViewAdapter($root),
      'ResourceView': Adapter.ResourceViewAdapter($root)
    }

  }

  Window.prototype = {
    initializeUI: function(){
      var self = this;

      this.$panel.draggable({
        handle: '.handle',
        containment: 'parent'
      });
      
      $.each(viewToClass, function(key){
        var cls = viewToClass[key];
        self.$panel.find('.view-change ' + cls).click(function(){
          if(self.container.view.finalize)
            self.container.view.finalize();
          var newView = 
            View[key](self.container.view.project(), self.manager, self.container.view.filter(), 
            d3.util.cloneHash(self.container.view.options()), 
            self);
          
          self.container.view = newView;
          self.renderAll();
        });
      });
      this.$panel.find('.toggle-options').click(function(){
        $(this).blur().toggleClass('active');
        self.$panel.find('.view-option-wrapper').animate({
          height: 'toggle'
        }, 200)
      });
      
      if(this.isMain) { //split
        self.$panel.find('.split-remove').hide();
        self.$panel.find('.split-h').click(function(){
          $(this).blur();
          self.manager.split(2);
          self.renderAll();
        });

        self.$panel.find('.split-v').click(function(){
          $(this).blur();
          self.manager.split(1);
          self.renderAll();
        });
      } else {
        self.$panel.find('.split').hide();
        self.$panel.find('.split-remove').show().click(function(){
          $(this).blur();
          self.manager.split(0);
          self.renderAll();
        });        
      }
    },
    setContainer: function(container){
      this.container = container;
    },
    setHeight: function(height){
      this.height = height;
      return this;
    },
    setWidth: function(width){
      this.width = width;
      return this;
    },
    layout: function(){
      if(this.$panel.hasClass('inited')) {
        var position = this.$panel.position(),
            width = this.$panel.width(),
            height = this.$panel.height()
            left = position.left,
            top = position.top,
            right = this.$root.width() - left - width,
            bottom = this.$root.height() - top - height
        
        if(left > right) {
          this.$panel.css('left', this.width - right - width + 'px');
        }

        if(top > bottom) {
          this.$panel.css('top', this.height - bottom - height + 'px');
        }
      }

      this.$root
        .width(this.width)
        .height(this.height)

      
      this.svg
        .attr('width', this.width)
        .attr('height', this.height)

    },
    render: function(isLastContainer, isSplitted){
      if(!this.$panel.hasClass('inited')) {
        this.$panel.css('top', '40px').css('left', (this.width - 220) + 'px').addClass('inited');
      }

      var 
          svg = this.svg,
          view = this.container.view,
          panelHeight = this.$panel.height(),
          panelWidth = this.$panel.width(),
          panelPosition = this.$panel.position(),
          minLeft = 10,
          maxLeft = this.width - panelWidth - 10,
          minTop = 10,
          maxTop = this.height - panelHeight - 10,
          left = panelPosition.left,
          top = panelPosition.top;


      if(left < minLeft)left = minLeft;
      if(left > maxLeft)left = maxLeft;
      if(top < minTop)top = minTop;
      if(top > maxTop)top = maxTop;
      this.$panel.animate({left:left,top:top}, 200);
      

      svg.select('g').remove();
      svg.select('defs').remove();
      svg.on('mousemove', null).on('contextmenu', null).on('click', null).on('mouseout', null).on('mouseover', null).on('.drag', null);

      var defs = svg.append('defs');

      d3.util.timer.start('rendering');
      view
        .width(this.width)
        .height(this.height)
        (svg.append('g'), true, svg, 'v' + new Date().getTime(), this.isMain, defs, isLastContainer);
      d3.util.timer.end('rendering');
        
      this.$root.find('.view-change .btn').removeClass('active');
      this.$root.find('.view-change ' + viewToClass[view.type()]).addClass('active');
      
      if(isLastContainer) {
        this.$panel.find('.view-change .btn').removeClass('disabled');
      } else {
        this.$panel.find('.view-change .btn').addClass('disabled');
      }

      if(isLastContainer && !isSplitted) {
        this.$panel.find('.split button').removeClass('disabled');
      } else { 
        this.$panel.find('.split button').addClass('disabled');
      }

      this.adapters[view.type()].view(view)();
    },
    fireEvent: function(type, args, add) {
      switch(type) {
        case 'focusAt':
          this.container.view.focusAt(args.at, add);
          break;
      }
    }
  }

  return Window;
});
