define(['jquery'
], function($){
  function PerformanceViewAdapter($root){
    var
        view,
        $viewOptions = $root.find('.view-option-wrapper'),
        $options = $root.find('.utilization-overview-options')
    ;

    function adapter(){
      $viewOptions.find('.view-options').hide();
      $options.show();
     
      if(view.isReferenceLineVisible()) {
        $options.find('.hide-reference-line input').prop('checked', false);
      } else {
        $options.find('.hide-reference-line input').prop('checked', true);
      }

      if(view.isCurrentTimeVisible()) {
        $options.find('.hide-current-time input').prop('checked', false);
      } else {
        $options.find('.hide-current-time input').prop('checked', true);
      }
      
      $options.find('.hide-reference-line').off().on('click', function(){
        view.isReferenceLineVisible(!$('input', this).prop('checked'));
      });

      $options.find('.hide-current-time').off().on('click', function(){
        view.isCurrentTimeVisible(!$('input', this).prop('checked'));
      });
    }
    
    adapter.view = function(value){
      if(!arguments.length) return view;
      view = value;
      return adapter;
    }

    return adapter;
  }
  return PerformanceViewAdapter;
});
