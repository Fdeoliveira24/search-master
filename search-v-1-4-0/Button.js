try {
    var searchContainer = document.getElementById('searchContainer');
    if (searchContainer) {
        if (!window.searchListInitiinitialized) {
            window.tourSearchFunctions.initializeSearch(this);
        }
        window.tourSearchFunctions.toggleSearch(searchContainer.style.display !== 'block');
    }
} catch (error) {
    console.error('Button action error:', error);
}

/* var _0x163581=_0x1b09;(function(_0x56c1b9,_0x3a80ee){var _0x47d4e1=_0x1b09,_0x313d91=_0x56c1b9();while(!![]){try{var _0x27fbfa=-parseInt(_0x47d4e1(0x1b7))/0x1+parseInt(_0x47d4e1(0x1b9))/0x2*(parseInt(_0x47d4e1(0x1c1))/0x3)+parseInt(_0x47d4e1(0x1be))/0x4*(parseInt(_0x47d4e1(0x1bf))/0x5)+parseInt(_0x47d4e1(0x1c2))/0x6+parseInt(_0x47d4e1(0x1b8))/0x7*(parseInt(_0x47d4e1(0x1bb))/0x8)+parseInt(_0x47d4e1(0x1c0))/0x9+-parseInt(_0x47d4e1(0x1b4))/0xa;if(_0x27fbfa===_0x3a80ee)break;else _0x313d91['push'](_0x313d91['shift']());}catch(_0x14aec1){_0x313d91['push'](_0x313d91['shift']());}}}(_0x5c06,0xe58b9));function _0x1b09(_0x30b257,_0x13fbbe){var _0x5c06ca=_0x5c06();return _0x1b09=function(_0x1b097a,_0x4776aa){_0x1b097a=_0x1b097a-0x1b4;var _0x489573=_0x5c06ca[_0x1b097a];return _0x489573;},_0x1b09(_0x30b257,_0x13fbbe);}function _0x5c06(){var _0x21a461=['display','Button\x20action\x20error:','1726026UxhWeg','1799812rvQsMC','74QSULWf','tourSearchFunctions','16vQLhQL','searchListInitiinitialized','style','4EKEttN','2497510jqQfkd','11697021IkPjAt','115701KisFiN','9147978tEeSqx','initializeSearch','25988020LjWvpZ'];_0x5c06=function(){return _0x21a461;};return _0x5c06();}try{var searchContainer=document['getElementById']('searchContainer');searchContainer&&(!window[_0x163581(0x1bc)]&&window[_0x163581(0x1ba)][_0x163581(0x1c3)](this),window[_0x163581(0x1ba)]['toggleSearch'](searchContainer[_0x163581(0x1bd)][_0x163581(0x1b5)]!=='block'));}catch(_0x589c40){console['error'](_0x163581(0x1b6),_0x589c40);} */