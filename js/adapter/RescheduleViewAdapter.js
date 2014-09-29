define(['jquery'
], function($){
  function RescheduleViewAdapter(){
    var
        view,
        $panel = $('#panel')
    ;
      
    function adapter(){
    }

    adapter.view = function(value){
      if(!arguments.length) return view;
      view = value;
      return adapter;
    }

    return adapter;
  }

  return RescheduleViewAdapter;
});
