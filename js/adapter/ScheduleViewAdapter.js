define(['jquery'
], function($){
  function ScheduleViewAdapter($root, refresh){
    var
        view,
        $viewOptions = $root.find('.view-option-wrapper'),
        $options = $root.find('.task-overview-options')
    
    ;

    function adapter(){
      $viewOptions.find('.view-options').hide();
      $options.show();
     
      $options.find('.hide-current-time input').prop('checked', !view.isCurrentTimeVisible());
      $options.find('.highlight-focused input').prop('checked', view.highlightFocused());

      $options.find('.hide-current-time input').off().on('click', function(){
        view.isCurrentTimeVisible(!$(this).prop('checked'));
      });
      $options.find('.highlight-focused input').off().on('click', function(){
        view.highlightFocused($(this).prop('checked'));
      });

      var aggregationLevel = view.aggregationLevel();
      $options.find('.aggr'+aggregationLevel+' input').prop('checked', true);
      if(aggregationLevel == 1) {
        $options.find('.tos input[data-type="'+view.sortType()+'"]').prop('checked', true);
      } else {
        $options.find('.tos input').prop('checked', false);
      }

      $options.find('.aggr input').off().on('click', function(){
        var al = parseInt($(this).attr('data-level'));
        view.aggregationLevel(al);
        if(al == 1) {
          $options.find('.tos input[data-type="'+view.sortType()+'"]').prop('checked', true);
        }
        refresh();
      });
      $options.find('.tos input').off().on('click', function(){
        var al = view.aggregationLevel();
        if(al != 1) {
          view.aggregationLevel(1);
//          $options.find('.aggr1 input').prop('checked', true);
          refresh();
        }
        var st = parseInt($(this).attr('data-type'));
        view.sortType(st);
        $(this).prop('checked', true);

      });
    }
    
    adapter.view = function(value){
      if(!arguments.length) return view;
      view = value;
      return adapter;
    }

    return adapter;
  }
  return ScheduleViewAdapter;
});
