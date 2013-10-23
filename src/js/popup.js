
var whiteList;

jQuery(document).ready(function ()
{
  whiteList=getBg().whiteList;
  loadAllCookies(whiteList, make);
});

function make(result)
{
  var view=$("#menu");

  chrome.tabs.getSelected(null, function (tab)
  {
    var uri=new URI(tab.url);
    var dom;
    if (uri.scheme=="http"||uri.scheme=="https") dom=uriHostAuthority(uri);

    if (dom!=null)
    {
      var onList=whiteList.getItemFor(dom);

      if (!onList)
      {
        var subs=splitSubdom2(dom);
        for (var i=0; i<subs.length; i++)
        {
          var item=subs[i];
          addWLItem(view, item, !whiteList.contains(item));
        }
      }
      else addWLItem(view, onList, false);
    }

    view.append($("<div></div>").addClass("menuItem").html(ti18n("popupClearAll", result.black.length, result.total)).click(ClearAll));

    view.append($("<div></div>").addClass("menuItem").html(ti18n("labelOptions")).click(function ()
    {
      showOptions(dom!=null?uriHostAuthority(uri):"");
      window.close();
    }));
  });
}

function addWLItem(view, item, enable)
{
  var div=$("<div></div>").addClass("menuItem").html(ti18n("popup"+(enable?"Add":"Del")+"White", item)).click(function () { doCmd(enable, item) });
  view.append(div);
}

function doCmd(add, dom)
{
  if (add) chrome.extension.sendRequest({ cmd: "addWhite", domain: dom });
  else chrome.extension.sendRequest({ cmd: "delWhite", domain: dom });
  window.close();
}

function ClearAll()
{
  if (whiteList.isEmpty()) $("#menu").text(ti18n("popupErrorEmpty"));
  else clearUnwantedCookies(whiteList, function (result) { $("#menu").text(ti18n("popupClearAllMsg", result.black.length, result.total)); });

  return false;
}
               
