/// <reference path="main.js" />

function DomPkg(name, load)
{
  var storageKey="p:"+name;
  var list;

  this.name=name;

  if (load) list=myStore.get(storageKey, new Array());
  else list=new Array();

  // old bug cleanup
  for (var i=list.length-1; i>=0; i--)
    if (list[i].session) list.splice(i, 1);

  this.get=function () { return list; };
  this.isEmpty=function () { return list.length==0; };

  this.clear=function () { list=new Array(); myStore.del(storageKey); };

  this.save=function () { myStore.set(storageKey, list); }

  function isEq(a, b)
  {
    return a.domain==b.domain&&a.path==b.path&&a.name==b.name&&a.secure==b.secure&&a.storeId==b.storeId;
  }

  function indexOf(c)
  {
    for (var i=0; i<list.length; i++)
      if (isEq(c, list[i])) return i;
    return -1;
  }

  this.add=function (c)
  {
    if (c==null) return;
    var idx=indexOf(c);
    if (idx>=0)
    {
      if (objectEquals(c, list[idx])) return;
      //console.log("upd-c "+JSON.stringify(c));
      //console.log("upd-l "+JSON.stringify(list[idx]));
      list.splice(idx, 1);
    }
    list.push(c);
    this.save();
  };

  this.remove=function (c)
  {
    if (c==null) return;
    var idx=indexOf(c);
    if (idx>=0)
    {
      list.splice(idx, 1);
      this.save();
    }
  };

  this.restore=function (c, forceOverwrite)
  {
    var idx=indexOf(c);
    if (idx>=0)
    {
      c=list[idx];
      var set=function (c) { chrome.cookies.set(cookieToDetail(c)); };
      if (!forceOverwrite)
      {
        chrome.cookies.get({ url: urlFromCookie(c), name: c.name, storeId: c.storeId }, function (c2)
        {
          if (!objectEquals(c, c2)) set(c);
          //else console.log("restore-skip");
        });
      }
      else set(c);
    }
  }

  function cookieToDetail(c, url)
  {
    var rc=
    {
      url: url!=null?url:urlFromCookie(c),
      name: c.name,
      value: c.value,
      path: c.path,
      secure: c.secure,
      httpOnly: c.httpOnly,
      storeId: c.storeId
    };
    if (!c.hostOnly) rc.domain=c.domain;
    if (!c.session) rc.expirationDate=c.expirationDate;
    return rc;
  }
}

function CookieStore()
{
  var dict=new Object();

  var init=function ()
  {
    var convert=myStore.get("protectedCookies", new Array());
    if (convert!=null)
    {
      for (var i=0; i<convert.length; i++)
        this.add(convert[i]);
      myStore.del("protectedCookies");
    }

    forEach(myStore.getAllKeys(), function (key)
    {
      if (strStartsWith(key, "p:"))
      {
        var name=key.substr(2);
        dict[name]=new DomPkg(name, true);
      }
    });
  };

  this.getAll=function ()
  {
    var rc=new Array();
    for (x in dict) rc=rc.concat(dict[x].get());
    return rc;
  };

  this.clear=function ()
  {
    for (x in dict)
    {
      dict[x].clear();
      delete dict[x];
    }
  };

  function getDP(dom)
  {
    var rc=dict[dom];
    if (rc==null) rc=dict[dom]=new DomPkg(dom);
    return rc;
  }

  this.add=function (c)
  {
    // exclude session cookies
    if (c!=null&&!c.session)
      getDP(c.domain).add(c);
  };

  this.remove=function (c)
  {
    if (c!=null)
      getDP(c.domain).remove(c);
  };

  this.restore=function (c, forceOverwrite)
  {
    var dp=dict[c.domain];
    if (dp!=null) dp.restore(c, forceOverwrite);
  }

  this.cleanUp=function (whiteList)
  {
    for (x in dict)
    {
      if (!whiteList.isWhite(x))
      {
        dict[x].clear();
        delete dict[x];
      }
    }
  }

  init.apply(this);
}

function loadAllCookies(whiteList, result)
{
  chrome.cookies.getAll({}, function (all)
  {
    //var total=all.length, black=0;
    var white=new Array(), black=new Array();

    for (var i=0; i<all.length; i++)
    {
      var c=all[i];
      if (whiteList.isWhite(c.domain)) white.push(c);
      else black.push(c);
    }

    result({ total: white.length+black.length, white: white, black: black });
  });
}

function groupCookiesByDom(list)
{
  var rc=new Array();
  for (var i=0; i<list.length; i++)
  {
    var dom=list[i].domain;
    if (strStartsWith(dom, ".")) dom=dom.substr(1);

    var idx=listIndexOf(rc, dom, function (x) { return x.dom; });
    if (idx>=0) rc[idx].count++;
    else rc.push({ dom: dom, count: 1 });
  }
  rc.sort(function (a, b) { return a.dom.localeCompare(b.dom); });
  return rc;
}

function urlFromCookie(c)
{
  return "http"+(c.secure?"s":"")+"://"+c.domain+c.path;
}

function uidFromCookie(c)
{
  return c.storeId+":"+(c.secure?"s:":"")+c.domain+c.path+":"+c.name;
}

function clearUnwantedCookies(whiteList, onReady)
{
  var log=getBg().log;
  if (log) log.write("clear-unwanted");
  loadAllCookies(whiteList, function (result)
  {
    var black=result.black;
    for (var i=0; i<black.length; i++)
    {
      var c=black[i];
      //console.log("del "+c.domain);
      chrome.cookies.remove(
      {
        "url": urlFromCookie(c),
        "name": c.name,
        "storeId": c.storeId
      });
    }
    if (onReady) onReady(result);
  });
}
