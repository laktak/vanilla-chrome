
var whiteList, option;

jQuery(document).ready(function ()
{
  localizePage();
  setVersionInfo();
  $("#showOptions").click(function () { showOptions(); return false; });
});

