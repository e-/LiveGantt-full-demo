define(['jquery'
], function($){
  function PackageViewAdapter($root){
    var
        view,
        $viewOptions = $root.find('.view-option-wrapper'),
        $options = $root.find('.tasktype-overview-options'),
        $packages = $root.find('.packages')
    
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
      
      $packages.find('li').remove();

      view.packages().forEach(function(package){
        var 
            $li = $('<li>').appendTo($packages),
            $div = $('<div>').appendTo($li).addClass('checkbox'),
            $label = $('<label>').appendTo($div),
            $input = $('<input>').attr('type', 'checkbox').appendTo($label)
         ;
         $label.append(package.getName())

         $input.on('click', function(){
           if($input.prop('checked')) {
             view.setVisible(package);
             view.unselectInvisible();
           } else {
             view.setInvisible(package);
           }
           view.refresh();
         });
      });
    }
    
    adapter.view = function(value){
      if(!arguments.length) return view;
      view = value;
      return adapter;
    }

    return adapter;
  }
  return PackageViewAdapter;
});
