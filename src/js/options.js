var whiteList, option, protectedCookies;

jQuery(document).ready(function ()
{
  if (location.href.indexOf("?")>0)
    whitelist_edit_entry=location.href.substring(location.href.indexOf("?")+1);

  whiteList=getBg().whiteList;
  option=getBg().option;
  protectedCookies=getBg().protectedCookies;

  showWhitelist();
  showExport();
  showOptions();
  localizePage();

  $("#diagRefresh").click(showDiag);
  $("#accordion").accordion({ collapsible: true, active: false, autoHeight: false, animated: false });

  setVersionInfo();
});

function showOptions()
{
  initOption($('#clearCookiesOnStartup'), option.clearCookiesOnStartup);
  initOption($('#protectCookies'), option.protectCookies);
  //initOption($('#autoDelDark'), option.autoDelDark);
  initOption($('#showUpdates'), option.showUpdates);
  initOption($('#hideTabIcon'), option.hideTabIcon);
  initOption($('#logEnable'), option.logging);

  disableOtherOption($("#clearCookiesOnStartup"), $("#protectCookies"), option.protectCookies);
  disableOtherOption($("#protectCookies"), $("#clearCookiesOnStartup"), option.clearCookiesOnStartup);

  $("#protectCookies").change(showWarning);
  showWarning();

  var m=option.autoDelDarkMinutes.get();
  if (!option.autoDelDark.get()) m=0;
  $("<option>").attr("value", 0).text(ti18n("optionsAutoDelDarkNever")).appendTo("#autoDelDarkMinutes");
  $.each(new Array(5, 10, 15, 20, 30, 45, 60), function(i, value)
  {
    var o=$("<option>").attr("value", value);
    if (value==m) o.attr("selected", "selected");
    o.text(ti18n("optionsAutoDelDarkMinutes", value)).appendTo("#autoDelDarkMinutes");
  });

  $("#autoDelDarkMinutes").change(function ()
  {
    var v=$("#autoDelDarkMinutes").val();
    option.autoDelDarkMinutes.set(v);
    option.autoDelDark.set(v>0);
  });

  $('.optionDescription').click(function ()
  {
    // trigger the UI & activate the handler as if a user had clicked it
    $(this).closest('tr').find('input').click().change();
    $(this).prev('input').click().change();
  });
}

function initOption(checkBox, optionItem)
{
  checkBox.attr('checked', optionItem.get());
  checkBox.change(function () { optionItem.set(checkBox.is(':checked')); });
}

function disableOtherOption(checkBox1, checkBox2, optionItem)
{
  checkBox1.change(function ()
  {
    if (checkBox1.is(':checked')&&checkBox2.is(':checked'))
    {
      checkBox2.click().change();
      optionItem.set(false);
    }
  });
}

function showWarning()
{
  var msg=option.protectCookies.get()?"1":"2";
  $("#protectCookiesWarning").html(ti18n("optionsProtectCookiesWarning"+msg));
}

function showLog()
{
  var diagLog=$("#diagLog");
  var log=getBg().log;
  var txt="";
  if (log) txt=listToTable(log.dump(), "diag_table", function (x) { return $('<div/>').text(x.time+" "+x.text+" ("+x.count+")"); });
  $(diagLog).html(txt);
}

function showExport()
{
  var expImp=$("#expimp");
  $("#btnImport").click(function () { whiteList.importText(expImp.val()); location.reload(true); });
  $("#btnExport").click(function () { expImp.val(whiteList.exportText()); });
}

function showDiag()
{
  loadAllCookies(whiteList, function (result)
  {
    var total=result.total;
    var blackDom=groupCookiesByDom(result.black);
    var whiteDom=groupCookiesByDom(result.white);
    var prot=groupCookiesByDom(protectedCookies.getAll());
    var format=function (x) { return $('<div/>').text(x.dom+" ("+x.count+")"); };
    var format2=function (x)
    {
      var rc=$("<div/>");
      rc.append($('<a href="#"/>').text(x.dom).click(function () { setWLEdit(x.dom); }));
      rc.append($("<span/>").text(" ("+x.count+")"));
      return rc;
    };

    $("#diagBlack").html(listToTable(blackDom, "diag_table", format2));
    $("#diagWhite").html(listToTable(whiteDom, "diag_table", format));
    $("#diagProtected").html(listToTable(prot, "diag_table", format));
  });
  showLog();
  return false;
}

function listToTable(list, className, createEntry)
{
  if (createEntry==null) createEntry=function (x) { return $('<div/>').text(x); }
  var table=$("<table></table>").addClass("className");
  $.each(list, function (i, x)
  {
    $("<tr></tr>").append($("<td>").html(createEntry(x))).appendTo(table);
  });
  return table;
}

function setWLEdit(entry)
{
  whitelist_edit_entry=entry;
  showWhitelist();
}

function showWhitelist()
{
  var view=$("#whitelisted_domains");

  var table=$("<table></table>").addClass("entry_table");
  view.html(table);

  $.each(whiteList.get(), function (i, entry)
  {
    var hasSubs=strStartsWith(entry, "*.");
    var cellTd=$("<td>").text(entry);
    var cellDel=$('<a href="#"></a>').css("margin-left", "10px").text(ti18n("optionsRemove")).click(function (event)
    {
      event.preventDefault();
      whiteList.remove(entry);
      showWhitelist();
    });
    var cellEdit=$('<a href="#"></a>').css("margin-left", "5px").text(ti18n("optionsEdit")).click(function (event)
    {
      event.preventDefault();
      whiteList.remove(entry);
      setWLEdit(entry);
    });

    var cellToggle=$('<span/>').css("margin-left", "7px");
    var tchk=$('<input type="checkbox">');
    tchk.attr('checked', hasSubs);
    tchk.change(function ()
    {
      whiteList.remove(entry);
      if (hasSubs) entry=entry.substr(2); else entry="*."+entry;
      whiteList.add(entry);
      showWhitelist();
    });
    cellToggle.append(tchk);
    cellToggle.append($('<a href="#"></a>').text(ti18n("optionsToggleSub")).click(function (event) { tchk.click().change(); }));

    $("<tr></tr>").append(cellTd).append(cellEdit).append(cellDel).append(cellToggle).appendTo(table);
  });

  var cell1=$("<td><input id='txtWhitelistedDomain' /></td>");
  var cell2=$("<input/>",
  {
    type: "button", id: "btnWhitelist", value: ti18n("optionsAdd"),
    disabled: "disabled", style: "height:22px;margin-top:2px;"
  });

  $("<tr></tr>").
      append(cell1).
      append(cell2).
      appendTo(table);

  $("#btnWhitelist").click(function ()
  {
    var domain=$("#txtWhitelistedDomain").val();
    if (domain=="") return;

    whiteList.add(domain);
    $("#txtWhitelistedDomain").val("");
    showWhitelist();
  });

  $('#txtWhitelistedDomain').keypress(function (event)
  {
    if (event.keyCode=='13'&&$("#btnWhitelist").attr("disabled")==false)
    {
      event.preventDefault();
      $("#btnWhitelist").click();
    }
  });

  $("#txtWhitelistedDomain").keyup(function ()
  {
    var domain=$(this).val();
    var ok=domain.length>0;
    $("#btnWhitelist").attr("disabled", ok?null:"disabled");
  });

  //Put entry from 'edit' in the textbox
  if (typeof whitelist_edit_entry!="undefined")
  {
    $('#txtWhitelistedDomain').val(whitelist_edit_entry);
    $("#txtWhitelistedDomain").keyup();
    delete whitelist_edit_entry;
  }

  showDiag();
}

