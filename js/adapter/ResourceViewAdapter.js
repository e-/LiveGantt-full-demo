define(['jquery'
], function($){
  function ResourceViewAdapter($root){
    var
        view,
        $viewOptions = $root.find('.view-option-wrapper'),
        $options = $root.find('.resource-overview-options')
    
    ;

    function adapter(){
      $viewOptions.find('.view-options').hide();
      $options.show();
      
      var st = view.sortType();
      $options.find('.ros input[data-type="'+st+'"]').prop('checked', true);

      $options.find('.ros input').off().on('click', function(){
        var st = parseInt($(this).attr('data-type'));
        view.sortType(st);
      });
    }
    
    adapter.view = function(value){
      if(!arguments.length) return view;
      view = value;
      return adapter;
    }

    return adapter;
  }
  return ResourceViewAdapter;
});
