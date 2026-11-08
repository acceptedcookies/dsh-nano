window.__ModuleLoader__.load({
	id: "dsh-nano-model-selector",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // src/client/index.jsx
  var React4 = __toESM(__require("react"), 1);

  // src/client/ModelSelector.jsx
  var React3 = __toESM(__require("react"), 1);
  var import_react_dom = __require("react-dom");

  // src/client/i18n.js
  var COPY = {
    zh: {
      title: "\u6A21\u578B\u9009\u62E9",
      searchPlaceholder: "\u641C\u7D22\u6A21\u578B\u3001\u63D0\u4F9B\u5546\u6216\u8BF4\u660E\u2026",
      searchClear: "\u6E05\u9664\u641C\u7D22",
      allProviders: "\u5168\u90E8",
      favorites: "\u6536\u85CF",
      refresh: "\u5237\u65B0\u6A21\u578B\u76EE\u5F55",
      close: "\u5173\u95ED",
      loading: "\u6B63\u5728\u52A0\u8F7D\u6A21\u578B\u2026",
      loadError: "\u6A21\u578B\u76EE\u5F55\u52A0\u8F7D\u5931\u8D25",
      retry: "\u91CD\u8BD5",
      noModels: "\u6CA1\u6709\u53EF\u7528\u6A21\u578B",
      noMatches: "\u6CA1\u6709\u5339\u914D\u7684\u6A21\u578B",
      noFavorites: "\u8FD8\u6CA1\u6709\u6536\u85CF\u6A21\u578B",
      selectModel: "\u9009\u62E9\u6A21\u578B",
      effort: "\u63A8\u7406\u7B49\u7EA7",
      providerDefault: "\u9ED8\u8BA4",
      noEffort: "\u8BE5\u6A21\u578B\u4E0D\u63D0\u4F9B\u63A8\u7406\u7B49\u7EA7",
      favorite: "\u6536\u85CF",
      unfavorite: "\u53D6\u6D88\u6536\u85CF",
      context: "\u4E0A\u4E0B\u6587",
      maxOutput: "\u8F93\u51FA\u4E0A\u9650",
      textInput: "\u6587\u672C",
      imageInput: "\u56FE\u7247",
      providerFailure: (name, message) => `${name} \u52A0\u8F7D\u5931\u8D25\uFF1A${message}`,
      modelCount: (count) => `${count} \u4E2A\u6A21\u578B`,
      favoriteCount: (count) => `${count} \u9879`,
      triggerSelect: "\u9009\u62E9\u6A21\u578B",
      triggerLoading: "\u52A0\u8F7D\u6A21\u578B\u2026",
      triggerAria: (model, effort) => `\u9009\u62E9\u6A21\u578B\uFF0C\u5F53\u524D ${model}${effort ? `\uFF0C\u63A8\u7406\u7B49\u7EA7 ${effort}` : ""}`,
      triggerSelectAria: "\u9009\u62E9\u6A21\u578B",
      switching: "\u6B63\u5728\u5207\u6362\u2026",
      selectionError: "\u5207\u6362\u6A21\u578B\u5931\u8D25"
    },
    en: {
      title: "Model selection",
      searchPlaceholder: "Search models, providers, or descriptions\u2026",
      searchClear: "Clear search",
      allProviders: "All",
      favorites: "Favorites",
      refresh: "Refresh model catalog",
      close: "Close",
      loading: "Loading models\u2026",
      loadError: "Could not load the model catalog",
      retry: "Retry",
      noModels: "No models available",
      noMatches: "No matching models",
      noFavorites: "No favorite models yet",
      selectModel: "Select model",
      effort: "Reasoning effort",
      providerDefault: "Default",
      noEffort: "This model has no reasoning levels",
      favorite: "Add to favorites",
      unfavorite: "Remove from favorites",
      context: "Context",
      maxOutput: "Max output",
      textInput: "Text",
      imageInput: "Images",
      providerFailure: (name, message) => `${name} failed to load: ${message}`,
      modelCount: (count) => `${count} ${count === 1 ? "model" : "models"}`,
      favoriteCount: (count) => `${count} ${count === 1 ? "item" : "items"}`,
      triggerSelect: "Select model",
      triggerLoading: "Loading model\u2026",
      triggerAria: (model, effort) => `Select model, current ${model}${effort ? `, reasoning effort ${effort}` : ""}`,
      triggerSelectAria: "Select model",
      switching: "Switching\u2026",
      selectionError: "Could not switch model"
    }
  };
  function languageOf(language) {
    return typeof language === "string" && language.toLowerCase().startsWith("zh") ? "zh" : "en";
  }
  function copyFor(language) {
    return COPY[languageOf(language)];
  }

  // src/client/BrandMark.jsx
  var React2 = __toESM(__require("react"), 1);

  // src/client/logos/DeepSeek.svg
  var DeepSeek_default = '<svg height="1em" style="flex:none;line-height:1" viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg"><title>DeepSeek</title><path d="M23.748 4.482c-.254-.124-.364.113-.512.234-.051.039-.094.09-.137.136-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.156-.708-.311-.955-.65-.172-.241-.219-.51-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.093.172.187.129.323-.082.28-.18.552-.266.833-.055.179-.137.217-.329.14a5.526 5.526 0 01-1.736-1.18c-.857-.828-1.631-1.742-2.597-2.458a11.365 11.365 0 00-.689-.471c-.985-.957.13-1.743.388-1.836.27-.098.093-.432-.779-.428-.872.004-1.67.295-2.687.684a3.055 3.055 0 01-.465.137 9.597 9.597 0 00-2.883-.102c-1.885.21-3.39 1.102-4.497 2.623C.082 8.606-.231 10.684.152 12.85c.403 2.284 1.569 4.175 3.36 5.653 1.858 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.133-.284 4.994-1.86.47.234.962.327 1.78.397.63.059 1.236-.03 1.705-.128.735-.156.684-.837.419-.961-2.155-1.004-1.682-.595-2.113-.926 1.096-1.296 2.746-2.642 3.392-7.003.05-.347.007-.565 0-.845-.004-.17.035-.237.23-.256a4.173 4.173 0 001.545-.475c1.396-.763 1.96-2.015 2.093-3.517.02-.23-.004-.467-.247-.588zM11.581 18c-2.089-1.642-3.102-2.183-3.52-2.16-.392.024-.321.471-.235.763.09.288.207.486.371.739.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.167-1.361-.802-2.5-1.86-3.301-3.307-.774-1.393-1.224-2.887-1.298-4.482-.02-.386.093-.522.477-.592a4.696 4.696 0 011.529-.039c2.132.312 3.946 1.265 5.468 2.774.868.86 1.525 1.887 2.202 2.891.72 1.066 1.494 2.082 2.48 2.914.348.292.625.514.891.677-.802.09-2.14.11-3.054-.614zm1-6.44a.306.306 0 01.415-.287.302.302 0 01.2.288.306.306 0 01-.31.307.303.303 0 01-.304-.308zm3.11 1.596c-.2.081-.399.151-.59.16a1.245 1.245 0 01-.798-.254c-.274-.23-.47-.358-.552-.758a1.73 1.73 0 01.016-.588c.07-.327-.008-.537-.239-.727-.187-.156-.426-.199-.688-.199a.559.559 0 01-.254-.078c-.11-.054-.2-.19-.114-.358.028-.054.16-.186.192-.21.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.391.451.462.576.685.914.176.265.336.537.445.848.067.195-.019.354-.25.452z" fill="#4D6BFE"></path></svg>';

  // src/client/logos/Mistral.svg
  var Mistral_default = '<svg height="1em" style="flex:none;line-height:1" viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg"><title>Mistral</title><path d="M3.428 3.4h3.429v3.428H3.428V3.4zm13.714 0h3.43v3.428h-3.43V3.4z" fill="gold"></path><path d="M3.428 6.828h6.857v3.429H3.429V6.828zm10.286 0h6.857v3.429h-6.857V6.828z" fill="#FFAF00"></path><path d="M3.428 10.258h17.144v3.428H3.428v-3.428z" fill="#FF8205"></path><path d="M3.428 13.686h3.429v3.428H3.428v-3.428zm6.858 0h3.429v3.428h-3.429v-3.428zm6.856 0h3.43v3.428h-3.43v-3.428z" fill="#FA500F"></path><path d="M0 17.114h10.286v3.429H0v-3.429zm13.714 0H24v3.429H13.714v-3.429z" fill="#E10500"></path></svg>';

  // src/client/logos/Cursor.svg
  var Cursor_default = '<svg fill="currentColor" fill-rule="evenodd" height="1em" style="flex:none;line-height:1" viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg"><title>Cursor</title><path d="M22.106 5.68L12.5.135a.998.998 0 00-.998 0L1.893 5.68a.84.84 0 00-.419.726v11.186c0 .3.16.577.42.727l9.607 5.547a.999.999 0 00.998 0l9.608-5.547a.84.84 0 00.42-.727V6.407a.84.84 0 00-.42-.726zm-.603 1.176L12.228 22.92c-.063.108-.228.064-.228-.061V12.34a.59.59 0 00-.295-.51l-9.11-5.26c-.107-.062-.063-.228.062-.228h18.55c.264 0 .428.286.296.514z"></path></svg>';

  // src/client/logos/Devin.svg
  var Devin_default = '<svg fill="currentColor" fill-rule="evenodd" height="1em" style="flex:none;line-height:1" viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg"><title>Devin</title><path d="M2.033 9.867l2.554 1.483a.589.589 0 00.592 0l2.554-1.483.01-.008a.608.608 0 00.11-.084l.013-.015a.631.631 0 00.076-.1c.003-.005.008-.01.01-.016a.558.558 0 00.052-.125l.007-.028a.611.611 0 00.019-.14V7.868c0-.572.307-1.105.8-1.392a1.595 1.595 0 011.598 0l1.277.742a.54.54 0 00.129.053l.028.01c.044.01.088.015.133.016h.006l.013-.002a.587.587 0 00.27-.074l.011-.004 2.554-1.483a.596.596 0 00.297-.516V2.253a.595.595 0 00-.297-.516L12.293.257a.587.587 0 00-.591 0L9.148 1.737l-.01.01a.609.609 0 00-.109.083l-.014.015a.632.632 0 00-.076.1c-.003.005-.008.01-.01.016a.57.57 0 00-.052.124l-.007.028a.612.612 0 00-.018.14v1.483c0 .572-.307 1.105-.8 1.393a1.597 1.597 0 01-1.599 0l-1.276-.742a.603.603 0 00-.13-.053l-.028-.008a.658.658 0 00-.133-.018h-.02a.57.57 0 00-.269.074c-.003.002-.008.002-.012.005L2.033 5.872a.596.596 0 00-.297.515v2.966c0 .213.113.41.297.515z"></path><path d="M15.943 10.607a1.596 1.596 0 011.599 0l1.276.74c.041.025.085.04.13.055l.028.008c.043.01.088.016.133.018h.005c.005 0 .01-.002.014-.003a.474.474 0 00.122-.016l.021-.005a.616.616 0 00.126-.052c.004-.002.009-.002.013-.005l2.554-1.482a.597.597 0 00.297-.516V6.383a.596.596 0 00-.297-.515l-2.552-1.483a.587.587 0 00-.592 0l-2.553 1.482-.011.008a.61.61 0 00-.108.084l-.014.016a.637.637 0 00-.076.1c-.003.005-.008.01-.01.016a.57.57 0 00-.052.124l-.007.029a.612.612 0 00-.018.14v1.482c0 .572-.307 1.105-.8 1.393a1.597 1.597 0 01-1.599 0l-1.276-.742a.584.584 0 00-.13-.053l-.028-.008a.62.62 0 00-.133-.018h-.02a.587.587 0 00-.269.074l-.012.004L9.15 10a.596.596 0 00-.296.516v2.966c0 .212.112.409.296.515l2.554 1.483s.008.002.012.005c.04.022.082.04.126.052l.02.004a.57.57 0 00.123.017l.014.002h.006c.054 0 .108-.01.16-.025a.587.587 0 00.13-.054l1.277-.741a1.597 1.597 0 012.398 1.392v1.482c0 .049.007.095.019.14l.007.028a.619.619 0 00.051.125c.004.006.008.01.01.016a.6.6 0 00.076.1l.014.015c.033.032.069.06.108.084.004.002.006.006.011.008l2.554 1.483a.59.59 0 00.593 0l2.554-1.483a.597.597 0 00.296-.516v-2.965a.595.595 0 00-.296-.516l-2.554-1.483s-.008-.002-.012-.005a.54.54 0 00-.126-.051c-.007-.003-.013-.003-.02-.005a.635.635 0 00-.125-.017h-.018a.557.557 0 00-.16.026.588.588 0 00-.13.053l-1.276.742a1.595 1.595 0 01-1.598 0 1.615 1.615 0 010-2.785l-.005-.001z"></path><path d="M14.848 18.265l-2.554-1.482-.012-.005a.526.526 0 00-.126-.052c-.007-.002-.014-.002-.02-.005a.64.64 0 00-.124-.017h-.02a.56.56 0 00-.16.026.588.588 0 00-.13.053l-1.276.742a1.594 1.594 0 01-1.598 0c-.493-.286-.8-.82-.8-1.393V14.65a.563.563 0 00-.018-.14l-.008-.028a.604.604 0 00-.051-.124l-.01-.017a.603.603 0 00-.076-.1l-.014-.015a.596.596 0 00-.109-.084c-.003-.002-.005-.006-.01-.008L5.178 12.65a.587.587 0 00-.591 0l-2.554 1.483a.596.596 0 00-.297.516v2.965c0 .213.113.41.297.516l2.554 1.483.012.004a.618.618 0 00.267.074l.016.002h.007a.55.55 0 00.16-.026.584.584 0 00.129-.053l1.277-.742a1.597 1.597 0 012.398 1.393v1.482c0 .05.007.095.019.14l.007.028c.013.044.03.085.051.125l.01.016c.022.036.047.07.076.1l.014.015c.032.032.069.06.109.084l.01.008 2.554 1.483a.587.587 0 00.593 0l2.554-1.483a.596.596 0 00.296-.515v-2.966a.596.596 0 00-.296-.516h-.002z"></path></svg>';

  // src/client/logos/GithubCopilot.svg
  var GithubCopilot_default = '<svg fill="currentColor" fill-rule="evenodd" height="1em" style="flex:none;line-height:1" viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg"><title>GithubCopilot</title><path d="M19.245 5.364c1.322 1.36 1.877 3.216 2.11 5.817.622 0 1.2.135 1.592.654l.73.964c.21.278.323.61.323.955v2.62c0 .339-.173.669-.453.868C20.239 19.602 16.157 21.5 12 21.5c-4.6 0-9.205-2.583-11.547-4.258-.28-.2-.452-.53-.453-.868v-2.62c0-.345.113-.679.321-.956l.73-.963c.392-.517.974-.654 1.593-.654l.029-.297c.25-2.446.81-4.213 2.082-5.52 2.461-2.54 5.71-2.851 7.146-2.864h.198c1.436.013 4.685.323 7.146 2.864zm-7.244 4.328c-.284 0-.613.016-.962.05-.123.447-.305.85-.57 1.108-1.05 1.023-2.316 1.18-2.994 1.18-.638 0-1.306-.13-1.851-.464-.516.165-1.012.403-1.044.996a65.882 65.882 0 00-.063 2.884l-.002.48c-.002.563-.005 1.126-.013 1.69.002.326.204.63.51.765 2.482 1.102 4.83 1.657 6.99 1.657 2.156 0 4.504-.555 6.985-1.657a.854.854 0 00.51-.766c.03-1.682.006-3.372-.076-5.053-.031-.596-.528-.83-1.046-.996-.546.333-1.212.464-1.85.464-.677 0-1.942-.157-2.993-1.18-.266-.258-.447-.661-.57-1.108-.32-.032-.64-.049-.96-.05zm-2.525 4.013c.539 0 .976.426.976.95v1.753c0 .525-.437.95-.976.95a.964.964 0 01-.976-.95v-1.752c0-.525.437-.951.976-.951zm5 0c.539 0 .976.426.976.95v1.753c0 .525-.437.95-.976.95a.964.964 0 01-.976-.95v-1.752c0-.525.437-.951.976-.951zM7.635 5.087c-1.05.102-1.935.438-2.385.906-.975 1.037-.765 3.668-.21 4.224.405.394 1.17.657 1.995.657h.09c.649-.013 1.785-.176 2.73-1.11.435-.41.705-1.433.675-2.47-.03-.834-.27-1.52-.63-1.813-.39-.336-1.275-.482-2.265-.394zm6.465.394c-.36.292-.6.98-.63 1.813-.03 1.037.24 2.06.675 2.47.968.957 2.136 1.104 2.776 1.11h.044c.825 0 1.59-.263 1.995-.657.555-.556.765-3.187-.21-4.224-.45-.468-1.335-.804-2.385-.906-.99-.088-1.875.058-2.265.394zM12 7.615c-.24 0-.525.015-.84.044.03.16.045.336.06.526l-.001.159a2.94 2.94 0 01-.014.25c.225-.022.425-.027.612-.028h.366c.187 0 .387.006.612.028-.015-.146-.015-.277-.015-.409.015-.19.03-.365.06-.526a9.29 9.29 0 00-.84-.044z"></path></svg>';

  // src/client/logos/Gemini-CLI.svg
  var Gemini_CLI_default = '<svg height="1em" style="flex:none;line-height:1" viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg"><title>Gemini CLI</title><path d="M0 4.391A4.391 4.391 0 014.391 0h15.217A4.391 4.391 0 0124 4.391v15.217A4.391 4.391 0 0119.608 24H4.391A4.391 4.391 0 010 19.608V4.391z" fill="url(#lobe-icons-gemini-cli-_R_0_)"></path><path clip-rule="evenodd" d="M19.74 1.444a2.816 2.816 0 012.816 2.816v15.48a2.816 2.816 0 01-2.816 2.816H4.26a2.816 2.816 0 01-2.816-2.816V4.26A2.816 2.816 0 014.26 1.444h15.48zM7.236 8.564l7.752 3.728-7.752 3.727v2.802l9.557-4.596v-3.866L7.236 5.763v2.801z" fill="#1E1E2E" fill-rule="evenodd"></path><defs><linearGradient gradientUnits="userSpaceOnUse" id="lobe-icons-gemini-cli-_R_0_" x1="24" x2="0" y1="6.587" y2="16.494"><stop stop-color="#EE4D5D"></stop><stop offset=".328" stop-color="#B381DD"></stop><stop offset=".476" stop-color="#207CFE"></stop></linearGradient></defs></svg>';

  // src/client/logos/WorkBuddy.png
  var WorkBuddy_default = "data:image/png;base64,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";

  // src/client/logos/Magpie.png
  var Magpie_default = "data:image/png;base64,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";

  // src/client/icons.jsx
  var React = __toESM(__require("react"), 1);
  var import_dsh_client_ui_primitives = __require("@deepseek-ai/dsh-client-ui-primitives");
  function GridIcon(props) {
    return /* @__PURE__ */ React.createElement(import_dsh_client_ui_primitives.IconFlatListOutlineRegular, { ...props });
  }
  function StarIcon({ filled = false, ...props }) {
    return filled ? /* @__PURE__ */ React.createElement(import_dsh_client_ui_primitives.IconPinFillRegular, { ...props }) : /* @__PURE__ */ React.createElement(import_dsh_client_ui_primitives.IconPinOutlineRegular, { ...props });
  }
  function SearchIcon(props) {
    return /* @__PURE__ */ React.createElement(import_dsh_client_ui_primitives.IconSearchOutlineRegular, { ...props });
  }
  function RefreshIcon(props) {
    return /* @__PURE__ */ React.createElement(import_dsh_client_ui_primitives.IconRefreshOutlineRegular, { ...props });
  }
  function CloseIcon(props) {
    return /* @__PURE__ */ React.createElement(import_dsh_client_ui_primitives.IconCloseOutlineRegular, { ...props });
  }
  function CheckIcon(props) {
    return /* @__PURE__ */ React.createElement(import_dsh_client_ui_primitives.IconCheckOutlineRegular, { ...props });
  }
  function ChevronDownIcon(props) {
    return /* @__PURE__ */ React.createElement(import_dsh_client_ui_primitives.IconChevronDownOutlineRegular, { ...props });
  }
  function ModelIcon(props) {
    return /* @__PURE__ */ React.createElement(import_dsh_client_ui_primitives.IconDataOutlineRegular, { ...props });
  }
  function WarningIcon(props) {
    return /* @__PURE__ */ React.createElement(import_dsh_client_ui_primitives.IconWarningTriangleOutlineRegular, { ...props });
  }
  function RouteIcon(props) {
    return /* @__PURE__ */ React.createElement(import_dsh_client_ui_primitives.IconBranchOutlineRegular, { ...props });
  }

  // src/client/BrandMark.jsx
  var SVG_LOGOS = {
    "deepseek-official": DeepSeek_default,
    "deepseek-account": DeepSeek_default,
    deepseek: DeepSeek_default,
    mistral: Mistral_default,
    cursor: Cursor_default,
    devin: Devin_default,
    copilot: GithubCopilot_default,
    githubcopilot: GithubCopilot_default,
    gemini: Gemini_CLI_default,
    geminicli: Gemini_CLI_default
  };
  var IMAGE_LOGOS = {
    workbuddy: WorkBuddy_default,
    magpie: Magpie_default
  };
  function BrandMark({ brandKey, brandName, className }) {
    const svg = SVG_LOGOS[brandKey];
    if (svg !== void 0) {
      return /* @__PURE__ */ React2.createElement(
        "span",
        {
          className: `nms-provider-logo${className ? ` ${className}` : ""}`,
          "aria-hidden": "true",
          dangerouslySetInnerHTML: { __html: svg }
        }
      );
    }
    const image = IMAGE_LOGOS[brandKey];
    if (image !== void 0) {
      return /* @__PURE__ */ React2.createElement("span", { className: `nms-provider-logo${className ? ` ${className}` : ""}`, "aria-hidden": "true" }, /* @__PURE__ */ React2.createElement("img", { src: image, alt: "" }));
    }
    if (brandKey === "auto") {
      return /* @__PURE__ */ React2.createElement("span", { className: `nms-provider-logo nms-provider-logo-route${className ? ` ${className}` : ""}`, "aria-hidden": "true" }, /* @__PURE__ */ React2.createElement(RouteIcon, { size: 18 }));
    }
    return /* @__PURE__ */ React2.createElement("span", { className: `nms-provider-mark${className ? ` ${className}` : ""}` }, initialsOf(brandName));
  }
  function initialsOf(name) {
    const words = String(name ?? "").replace(/([a-z])([A-Z])/gu, "$1 $2").split(/\s+/u).filter(Boolean);
    if (words.length > 1) return `${words[0][0]}${words[1][0]}`.toUpperCase();
    return (words[0]?.slice(0, 2) || "?").toUpperCase();
  }

  // src/client/favorites.js
  var KEY = "dsh-nano-model-selector:favorites.v1";
  function readFavorites() {
    try {
      const raw = window.localStorage?.getItem(KEY);
      if (raw === null || raw === void 0) return [];
      const value = JSON.parse(raw);
      return Array.isArray(value) ? [...new Set(value.filter((item) => typeof item === "string"))] : [];
    } catch {
      return [];
    }
  }
  function writeFavorites(favorites) {
    try {
      window.localStorage?.setItem(KEY, JSON.stringify(favorites));
    } catch {
    }
  }

  // src/client/styles.js
  var STYLE = `
.nms-root { position: relative; min-width: 0; }
.nms-trigger {
  display: flex; align-items: center; gap: 4px; min-width: 0; max-width: 360px; height: 28px;
  padding: 0 4px 0 8px; border: 0; border-radius: var(--dsw-radius-sm); outline: none;
  background: transparent; color: var(--dsw-alias-label-secondary);
  font-size: 13px; line-height: 20px; font-weight: 400; font-family: inherit; cursor: pointer;
}
.nms-trigger:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }
.nms-trigger:focus-visible { box-shadow: 0 0 0 2px var(--dsw-focus-ring-color, var(--dsw-alias-brand-primary)); }
.nms-trigger:disabled { color: var(--dsw-alias-label-dimmed); cursor: default; }
.nms-trigger-label { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: var(--dsh-composer-model-text-display, block); }
.nms-trigger-effort { flex-shrink: 1000; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-caption); display: var(--dsh-composer-model-text-display, block); }
.nms-trigger-icon { display: var(--dsh-composer-model-icon-display, none); flex: none; }
.nms-trigger-chevron { flex: none; color: var(--dsw-alias-label-caption); transition: transform 120ms ease; }
.nms-trigger-open .nms-trigger-chevron { transform: rotate(180deg); }
.nms-trigger-busy { width: 12px; height: 12px; flex: none; border-radius: 50%; border: 1.5px solid var(--dsw-alias-label-tertiary); border-top-color: transparent; animation: nms-spin .8s linear infinite; }

.nms-panel {
  box-sizing: border-box; position: fixed; z-index: 1200; display: flex; flex-direction: column;
  overflow: hidden; padding: 0; border: 1px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-panel, 16px); background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary); box-shadow: var(--dsw-elevation-prominent);
  font-family: var(--dsw-font-family); font-size: 13px;
  animation: nms-pop 120ms ease-out; transform-origin: bottom right;
}
.nms-top { display: flex; align-items: center; gap: 10px; flex: none; height: 58px; box-sizing: border-box; padding: 0 12px; border-bottom: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); }
.nms-title { display: flex; align-items: center; gap: 8px; flex: none; min-width: 0; }
.nms-title-icon { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: var(--dsw-radius-md); background: var(--dsw-alias-interactive-bg-active); color: var(--dsw-alias-brand-primary); }
.nms-title-text { display: flex; flex-direction: column; min-width: 0; }
.nms-title-main { font-size: 13px; line-height: 18px; font-weight: 600; white-space: nowrap; }
.nms-title-sub { font-size: 11px; line-height: 15px; color: var(--dsw-alias-label-tertiary); white-space: nowrap; }
.nms-search { position: relative; display: flex; align-items: center; gap: 6px; flex: 1; min-width: 120px; height: 34px; box-sizing: border-box; padding: 0 9px; border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-lg); background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-tertiary); transition: border-color 120ms ease, background 120ms ease; }
.nms-search:focus-within { border-color: var(--dsw-alias-brand-primary); background: var(--dsw-alias-bg-layer-1); }
.nms-search input { flex: 1; min-width: 0; padding: 0; border: 0; outline: 0; background: transparent; color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; line-height: 18px; }
.nms-search input::placeholder { color: var(--dsw-alias-label-tertiary); }
.nms-search-clear { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; flex: none; padding: 0; border: 0; border-radius: 50%; background: transparent; color: var(--dsw-alias-label-tertiary); cursor: pointer; }
.nms-search-clear:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.nms-icon-button { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; flex: none; padding: 0; border: 0; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; }
.nms-icon-button:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.nms-icon-button:disabled { color: var(--dsw-alias-label-dimmed); cursor: default; }
.nms-body { display: flex; flex: 1; min-height: 0; }
.nms-rail { display: flex; flex-direction: column; align-items: center; gap: 2px; flex: none; width: 54px; box-sizing: border-box; padding: 6px 4px; border-right: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2); overflow-y: auto; scrollbar-width: none; }
.nms-rail::-webkit-scrollbar { display: none; }
.nms-rail-item { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; flex: none; padding: 0; border: 1px solid transparent; border-radius: 10px; background: transparent; color: var(--dsw-alias-label-secondary); cursor: pointer; }
.nms-rail-item:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.nms-rail-item[data-active="true"] { border-color: color-mix(in srgb, var(--dsw-alias-state-business-primary) 40%, var(--dsw-alias-border-l2)); background: transparent; color: var(--dsw-alias-label-primary); }
.nms-rail-item[data-favorite="true"] { color: #e6b84a; }
.nms-rail-sep { width: 24px; height: 1px; margin: 3px 0; flex: none; background: var(--dsw-alias-border-l2); }
.nms-provider-mark { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 8px; background: var(--nms-provider-bg, var(--dsw-alias-interactive-bg-active)); color: var(--nms-provider-fg, var(--dsw-alias-label-primary)); font-size: 10px; line-height: 1; font-weight: 700; letter-spacing: -.02em; }
.nms-provider-logo { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; flex: none; overflow: hidden; }
.nms-provider-logo svg { display: block; width: 100%; height: 100%; }
.nms-provider-logo img { display: block; width: 100%; height: 100%; object-fit: contain; }
.nms-provider-logo-route { color: var(--dsw-alias-label-secondary); }
.nms-main { display: flex; flex: 1; flex-direction: column; min-width: 0; min-height: 0; }
.nms-scroll { flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden; padding: 8px 16px 10px; scrollbar-gutter: stable both-edges; }
.nms-group { display: flex; align-items: center; gap: 6px; margin: 10px 0 4px; color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 16px; font-weight: 600; letter-spacing: .035em; }
.nms-group:first-child { margin-top: 2px; }
.nms-group-count { font-weight: 400; color: var(--dsw-alias-label-tertiary); }
.nms-group-star { color: #e6b84a; }
.nms-model-row { display: flex; align-items: stretch; gap: 0; width: 100%; height: 64px; box-sizing: border-box; min-width: 0; margin: 0 0 4px; border-radius: var(--dsw-radius-md); }
.nms-model-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.nms-model-row[data-active="true"] { background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 16%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--dsw-alias-state-business-primary) 24%, transparent); }
.nms-model-row[data-pending="true"] { opacity: .72; }
.nms-model-main { display: flex; align-items: center; gap: 10px; flex: 1; height: 100%; min-width: 0; padding: 6px 6px 6px 8px; border: 0; border-radius: var(--dsw-radius-md); background: transparent; color: inherit; text-align: left; font: inherit; cursor: pointer; overflow: hidden; }
.nms-model-main:disabled { cursor: default; }
.nms-model-mark { flex: none; margin-top: 1px; }
.nms-model-copy { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; overflow: hidden; }
.nms-model-line { display: flex; align-items: center; flex-wrap: nowrap; gap: 5px; min-width: 0; overflow: hidden; }
.nms-model-name { min-width: 0; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; line-height: 18px; font-weight: 500; }
.nms-tag { display: inline-flex; align-items: center; height: 17px; padding: 0 5px; border-radius: 5px; background: var(--dsw-alias-interactive-bg-active); color: var(--dsw-alias-label-secondary); font-size: 10px; line-height: 17px; font-weight: 500; white-space: nowrap; }
.nms-tag-info { background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 18%, transparent); color: var(--dsw-alias-state-business-primary); }
.nms-tag-success { background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 18%, transparent); color: var(--dsw-alias-state-success-primary); }
.nms-tag-warning { background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 18%, transparent); color: var(--dsw-alias-state-warn-primary); }
.nms-model-desc { display: block; min-width: 0; overflow: hidden; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 16px; white-space: nowrap; text-overflow: clip; -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 28px), transparent); mask-image: linear-gradient(to right, #000 calc(100% - 28px), transparent); }
.nms-model-meta { min-width: 0; overflow: hidden; color: var(--dsw-alias-label-tertiary); font-size: 10px; line-height: 14px; text-overflow: ellipsis; white-space: nowrap; }
.nms-model-side { display: flex; align-items: center; gap: 2px; flex: none; padding: 0 6px 0 0; }
.nms-star { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; padding: 0; border: 0; border-radius: var(--dsw-radius-sm); background: transparent; color: var(--dsw-alias-label-tertiary); cursor: pointer; }
.nms-star:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.nms-star[data-active="true"] { color: #e6b84a; }
.nms-check { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; color: var(--dsw-alias-state-business-primary); }
.nms-pending-dot { width: 10px; height: 10px; margin: 5px; border-radius: 50%; border: 1.5px solid var(--dsw-alias-label-tertiary); border-top-color: transparent; animation: nms-spin .8s linear infinite; }
.nms-empty, .nms-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-height: 160px; padding: 20px; color: var(--dsw-alias-label-tertiary); font-size: 12px; text-align: center; }
.nms-empty-icon { display: inline-flex; width: 34px; height: 34px; align-items: center; justify-content: center; border-radius: 10px; background: var(--dsw-alias-interactive-bg-active); color: var(--dsw-alias-label-tertiary); }
.nms-error { display: flex; align-items: flex-start; gap: 8px; margin: 4px 0 8px; padding: 8px 9px; border-radius: var(--dsw-radius-md); background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent); color: var(--dsw-alias-state-error-primary); font-size: 11px; line-height: 16px; }
.nms-error-copy { flex: 1; min-width: 0; }
.nms-retry { flex: none; padding: 0; border: 0; background: transparent; color: inherit; font: inherit; font-weight: 600; cursor: pointer; }
.nms-effort { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; flex: none; min-height: 46px; box-sizing: border-box; padding: 8px 12px; border-top: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2); }
.nms-effort-label { flex: none; color: var(--dsw-alias-label-tertiary); font-size: 11px; font-weight: 600; letter-spacing: .02em; }
.nms-effort-list { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; min-width: 0; }
.nms-effort-button { display: inline-flex; align-items: center; justify-content: center; height: 26px; padding: 0 9px; border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-sm); background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-secondary); font: inherit; font-size: 11px; cursor: pointer; }
.nms-effort-button:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.nms-effort-button[data-active="true"] { border-color: var(--dsw-alias-state-business-primary); background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 15%, transparent); color: var(--dsw-alias-label-primary); }
.nms-effort-button:disabled { color: var(--dsw-alias-label-dimmed); cursor: default; }
.nms-effort-note { color: var(--dsw-alias-label-tertiary); font-size: 11px; }
.nms-toast { position: fixed; z-index: 1300; left: 50%; bottom: 24px; transform: translateX(-50%); max-width: min(480px, calc(100vw - 32px)); padding: 8px 12px; border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-layer-3); color: var(--dsw-alias-state-error-primary); box-shadow: var(--dsw-elevation-prominent); font-size: 12px; line-height: 18px; }
@keyframes nms-spin { to { transform: rotate(360deg); } }
@keyframes nms-pop { from { opacity: 0; transform: translateY(6px) scale(.985); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .nms-panel { animation: none; } .nms-trigger-chevron { transition: none; } }
`;

  // src/client/ModelSelector.jsx
  var STYLE_ID = "nano-model-selector-style";
  var MODEL_CARD_HEIGHT = 64;
  var MODEL_CARD_GAP = 4;
  var PANEL_CHROME_HEIGHT = 58 + 46 + 18 + 2;
  function keyOf(provider, model) {
    return `${provider}/${model}`;
  }
  function formatTokens(value) {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "";
    if (value >= 1e6) {
      const millions = value / 1e6;
      return `${Number.isInteger(millions) ? millions : millions.toFixed(1).replace(/\.0$/u, "")}M`;
    }
    if (value >= 1e3) {
      const thousands = value / 1e3;
      return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1).replace(/\.0$/u, "")}K`;
    }
    return String(value);
  }
  function detailsIndex(details) {
    const result = /* @__PURE__ */ new Map();
    for (const group of details?.groups ?? []) {
      for (const model of group.models ?? []) result.set(keyOf(group.id, model.id), model);
    }
    return result;
  }
  function textValue(text) {
    if (typeof text === "string") return text;
    if (text && typeof text === "object") {
      const value = text.zh ?? text.en ?? Object.values(text)[0];
      return typeof value === "string" ? value : "";
    }
    return "";
  }
  function reasoningOf(item) {
    return item?.details?.reasoning ?? item?.model?.reasoning;
  }
  var BRAND_NAMES = {
    auto: "Auto",
    mistral: "Mistral",
    workbuddy: "WorkBuddy",
    cursor: "Cursor",
    devin: "Devin",
    deepseek: "DeepSeek",
    "deepseek-official": "DeepSeek",
    "deepseek-account": "DeepSeek Account"
  };
  function brandOf(group, model) {
    const id = String(model.id ?? "");
    const slash = id.indexOf("/");
    const key = slash > 0 ? id.slice(0, slash) : group.id;
    const mapped = BRAND_NAMES[key] ?? BRAND_NAMES[group.id];
    const name = mapped ?? key.replace(/[-_]+/gu, " ").replace(/\b[a-z]/gu, (char) => char.toUpperCase());
    return { key, name };
  }
  function ModelSelector({ locked, available, directory, load, select, language, resolveText }) {
    const [copy, setCopy] = React3.useState(() => copyFor(language.current()));
    const [open, setOpen] = React3.useState(false);
    const [filter, setFilter] = React3.useState("all");
    const [query, setQuery] = React3.useState("");
    const [favorites, setFavorites] = React3.useState(() => readFavorites());
    const [details, setDetails] = React3.useState(null);
    const [position, setPosition] = React3.useState(null);
    const [toast, setToast] = React3.useState(null);
    const triggerRef = React3.useRef(null);
    const panelRef = React3.useRef(null);
    const searchRef = React3.useRef(null);
    const toastSeq = React3.useRef(0);
    const state = React3.useSyncExternalStore(
      (listener) => directory.store.subscribe(listener),
      () => directory.store.getSnapshot()
    );
    React3.useEffect(() => language.subscribe(() => setCopy(copyFor(language.current()))), []);
    React3.useEffect(() => {
      if (available) load();
    }, [available]);
    React3.useEffect(() => {
      if (document.getElementById(STYLE_ID) !== null) return void 0;
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = STYLE;
      document.head.append(style);
      return () => {
        style.remove();
      };
    }, []);
    React3.useEffect(() => {
      if (toast === null) return void 0;
      const timer = window.setTimeout(() => {
        setToast(null);
      }, 6e3);
      return () => {
        window.clearTimeout(timer);
      };
    }, [toast]);
    React3.useEffect(() => {
      if (!open) return void 0;
      let cancelled = false;
      fetch("/nano-model-selector/catalog", { credentials: "same-origin", cache: "no-store" }).then((response) => response.ok ? response.json() : void 0).then((value) => {
        if (!cancelled) setDetails(value ?? null);
      }).catch(() => {
      });
      return () => {
        cancelled = true;
      };
    }, [open]);
    const refreshDetails = React3.useCallback(() => {
      fetch("/nano-model-selector/catalog", { credentials: "same-origin", cache: "no-store" }).then((response) => response.ok ? response.json() : void 0).then((value) => setDetails(value ?? null)).catch(() => {
      });
    }, []);
    React3.useEffect(() => {
      if (!open) return void 0;
      const onPointer = (event) => {
        if (triggerRef.current?.contains(event.target)) return;
        if (panelRef.current?.contains(event.target)) return;
        setOpen(false);
      };
      document.addEventListener("pointerdown", onPointer, true);
      return () => document.removeEventListener("pointerdown", onPointer, true);
    }, [open]);
    React3.useEffect(() => {
      if (!open) return void 0;
      const onKey = (event) => {
        if (event.key !== "Escape" || event.isComposing) return;
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      };
      document.addEventListener("keydown", onKey, true);
      return () => document.removeEventListener("keydown", onKey, true);
    }, [open]);
    React3.useEffect(() => {
      if (!open) return void 0;
      const frame = requestAnimationFrame(() => {
        if (!window.matchMedia("(pointer: coarse)").matches) searchRef.current?.focus();
      });
      return () => cancelAnimationFrame(frame);
    }, [open]);
    const detailMap = React3.useMemo(() => detailsIndex(details), [details]);
    const groups = React3.useMemo(() => (state.groups ?? []).map((group) => ({
      ...group,
      models: group.models.map((model) => {
        const brand = brandOf(group, model);
        return {
          group,
          model,
          key: keyOf(group.id, model.id),
          brandKey: brand.key,
          brandName: brand.name,
          details: detailMap.get(keyOf(group.id, model.id)),
          reasoning: detailMap.get(keyOf(group.id, model.id))?.reasoning ?? model.reasoning
        };
      })
    })), [state.groups, detailMap]);
    const allModels = React3.useMemo(() => groups.flatMap((group) => group.models), [groups]);
    const brands = React3.useMemo(() => {
      const seen = /* @__PURE__ */ new Set();
      const result = [];
      for (const item of allModels) {
        if (seen.has(item.brandKey)) continue;
        seen.add(item.brandKey);
        result.push({
          key: item.brandKey,
          name: item.brandName,
          count: allModels.filter((candidate) => candidate.brandKey === item.brandKey).length
        });
      }
      return result;
    }, [allModels]);
    const favoriteSet = React3.useMemo(() => new Set(favorites), [favorites]);
    const favoriteItems = React3.useMemo(() => favorites.map((key) => allModels.find((item) => item.key === key)).filter(Boolean), [favorites, allModels]);
    const matches = React3.useCallback((item) => {
      if (filter === "favorites") return favoriteSet.has(item.key);
      if (filter !== "all" && item.brandKey !== filter) return false;
      const wanted = query.trim().toLowerCase();
      if (wanted === "") return true;
      const haystack = `${item.model.name} ${item.model.id} ${item.model.description ?? ""} ${item.brandName} ${item.group.name}`.toLowerCase();
      return haystack.includes(wanted);
    }, [filter, favoriteSet, query]);
    const visibleFavorites = favoriteItems.filter(matches);
    const visibleGroups = brands.filter((brand) => filter === "all" || filter === brand.key).map((brand) => ({
      ...brand,
      models: allModels.filter((item) => item.brandKey === brand.key && matches(item) && !favoriteSet.has(item.key))
    })).filter((group) => group.models.length > 0);
    const visibleCount = visibleFavorites.length + visibleGroups.reduce((sum, group) => sum + group.models.length, 0);
    React3.useLayoutEffect(() => {
      if (!open) return void 0;
      const place = () => {
        const trigger = triggerRef.current;
        if (!trigger) return;
        const rect = trigger.getBoundingClientRect();
        const margin = 12;
        const width = Math.min(440, window.innerWidth - margin * 2);
        const available2 = window.innerHeight - margin * 2;
        const height = Math.min((MODEL_CARD_HEIGHT + MODEL_CARD_GAP) * 4.5 + PANEL_CHROME_HEIGHT, available2);
        let left = Math.min(Math.max(margin, rect.right - width), Math.max(margin, window.innerWidth - width - margin));
        let top = rect.top - height - 8;
        if (top < margin) top = Math.min(window.innerHeight - height - margin, rect.bottom + 8);
        if (top < margin) top = margin;
        setPosition({ left, top, width, height });
      };
      place();
      window.addEventListener("resize", place);
      window.addEventListener("scroll", place, true);
      return () => {
        window.removeEventListener("resize", place);
        window.removeEventListener("scroll", place, true);
      };
    }, [open]);
    const current = state.current;
    const currentItem = current === null ? void 0 : allModels.find((item) => item.group.id === current.provider && item.model.id === current.model);
    const currentReasoning = reasoningOf(currentItem);
    const effectiveEffort = current?.reasoningEffort ?? currentReasoning?.defaultEffort;
    const effortLabel = currentItem === void 0 ? state.retainedEffort : currentReasoning === void 0 ? state.retainedEffort : effectiveEffort === void 0 ? copy.providerDefault : currentReasoning.efforts.find((level) => level.id === effectiveEffort)?.name ?? effectiveEffort;
    const triggerText = currentItem?.model.name ?? current?.model ?? (state.status === "loading" ? copy.triggerLoading : copy.triggerSelect);
    const triggerAria = currentItem === void 0 ? copy.triggerSelectAria : copy.triggerAria(triggerText, effortLabel);
    const busy = state.pending !== null;
    const visible = Boolean(available);
    const refresh = () => {
      load();
      refreshDetails();
    };
    const close = (restoreFocus = false) => {
      setOpen(false);
      if (restoreFocus) queueMicrotask(() => triggerRef.current?.focus());
    };
    const toggleFavorite = (key, event) => {
      event.preventDefault();
      event.stopPropagation();
      const next = favoriteSet.has(key) ? favorites.filter((item) => item !== key) : [...favorites, key];
      setFavorites(next);
      writeFavorites(next);
    };
    const reportError = (error) => {
      toastSeq.current += 1;
      setToast({ seq: toastSeq.current, text: `${copy.selectionError}: ${error instanceof Error ? error.message : String(error)}` });
    };
    const settle = (result, closeAfter) => {
      if (result === void 0) return;
      if (result.ok) {
        if (closeAfter) close(true);
        return;
      }
      toastSeq.current += 1;
      setToast({ seq: toastSeq.current, text: `${copy.selectionError}: ${result.error.code}` });
    };
    const chooseModel = (item) => {
      if (busy) return;
      if (current?.provider === item.group.id && current.model === item.model.id) {
        close(true);
        return;
      }
      void select({ provider: item.group.id, model: item.model.id }).then((result) => settle(result, false)).catch(reportError);
    };
    const chooseEffort = (effort) => {
      if (busy || current === null) return;
      if (effectiveEffort === effort) {
        close(true);
        return;
      }
      void select({
        provider: current.provider,
        model: current.model,
        ...effort === void 0 ? {} : { reasoningEffort: effort }
      }).then((result) => settle(result, true)).catch(reportError);
    };
    const onPanelKeyDown = (event) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const rows = Array.from(panelRef.current?.querySelectorAll("button.nms-model-main:not(:disabled)") ?? []);
      if (rows.length === 0) return;
      const active = rows.indexOf(document.activeElement);
      event.preventDefault();
      if (active === -1) {
        rows[event.key === "ArrowDown" ? 0 : rows.length - 1]?.focus();
        return;
      }
      rows[(active + (event.key === "ArrowDown" ? 1 : -1) + rows.length) % rows.length]?.focus();
    };
    const effortChoices = currentReasoning === void 0 ? [] : [
      ...currentReasoning.defaultEffort === void 0 ? [{ id: void 0, name: copy.providerDefault, description: void 0 }] : [],
      ...currentReasoning.efforts
    ];
    if (!visible) return null;
    return /* @__PURE__ */ React3.createElement("div", { className: "nms-root", "data-nano-model-selector": "root" }, /* @__PURE__ */ React3.createElement(
      "button",
      {
        ref: triggerRef,
        type: "button",
        className: `nms-trigger${open ? " nms-trigger-open" : ""}`,
        "aria-label": triggerAria,
        "aria-haspopup": "dialog",
        "aria-expanded": open,
        "aria-busy": busy,
        title: effortLabel === void 0 ? triggerText : `${triggerText} \xB7 ${effortLabel}`,
        disabled: locked,
        onClick: () => {
          if (open) close(true);
          else {
            setQuery("");
            setOpen(true);
            load();
          }
        }
      },
      /* @__PURE__ */ React3.createElement(ModelIcon, { className: "nms-trigger-icon", size: 15 }),
      /* @__PURE__ */ React3.createElement("span", { className: "nms-trigger-label" }, triggerText),
      effortLabel !== void 0 && /* @__PURE__ */ React3.createElement("span", { className: "nms-trigger-effort" }, effortLabel),
      busy ? /* @__PURE__ */ React3.createElement("span", { className: "nms-trigger-busy", "aria-hidden": "true" }) : /* @__PURE__ */ React3.createElement(ChevronDownIcon, { className: "nms-trigger-chevron" })
    ), open && (0, import_react_dom.createPortal)(
      /* @__PURE__ */ React3.createElement(
        "div",
        {
          className: "nms-panel",
          ref: panelRef,
          role: "dialog",
          "aria-label": copy.title,
          style: position === null ? { visibility: "hidden" } : position,
          onKeyDown: onPanelKeyDown
        },
        /* @__PURE__ */ React3.createElement("div", { className: "nms-top" }, /* @__PURE__ */ React3.createElement("div", { className: "nms-title" }, /* @__PURE__ */ React3.createElement("span", { className: "nms-title-icon" }, /* @__PURE__ */ React3.createElement(ModelIcon, { size: 16 })), /* @__PURE__ */ React3.createElement("span", { className: "nms-title-text" }, /* @__PURE__ */ React3.createElement("span", { className: "nms-title-main" }, copy.title), /* @__PURE__ */ React3.createElement("span", { className: "nms-title-sub" }, copy.modelCount(allModels.length)))), /* @__PURE__ */ React3.createElement("label", { className: "nms-search" }, /* @__PURE__ */ React3.createElement(SearchIcon, { size: 14 }), /* @__PURE__ */ React3.createElement(
          "input",
          {
            ref: searchRef,
            type: "text",
            role: "searchbox",
            value: query,
            placeholder: copy.searchPlaceholder,
            "aria-label": copy.searchPlaceholder,
            onChange: (event) => setQuery(event.target.value)
          }
        ), query !== "" && /* @__PURE__ */ React3.createElement("button", { type: "button", className: "nms-search-clear", "aria-label": copy.searchClear, onClick: () => setQuery("") }, /* @__PURE__ */ React3.createElement(CloseIcon, { size: 12 }))), /* @__PURE__ */ React3.createElement("button", { type: "button", className: "nms-icon-button", title: copy.refresh, "aria-label": copy.refresh, onClick: refresh, disabled: state.status === "loading" }, /* @__PURE__ */ React3.createElement(RefreshIcon, { size: 16 })), /* @__PURE__ */ React3.createElement("button", { type: "button", className: "nms-icon-button", title: copy.close, "aria-label": copy.close, onClick: () => close(true) }, /* @__PURE__ */ React3.createElement(CloseIcon, { size: 16 }))),
        /* @__PURE__ */ React3.createElement("div", { className: "nms-body" }, /* @__PURE__ */ React3.createElement("nav", { className: "nms-rail", "aria-label": copy.title }, /* @__PURE__ */ React3.createElement(
          "button",
          {
            type: "button",
            className: "nms-rail-item",
            "data-active": filter === "all",
            title: copy.allProviders,
            "aria-label": copy.allProviders,
            "aria-pressed": filter === "all",
            onClick: () => {
              setFilter("all");
              setQuery("");
            }
          },
          /* @__PURE__ */ React3.createElement(GridIcon, { size: 17 })
        ), /* @__PURE__ */ React3.createElement(
          "button",
          {
            type: "button",
            className: "nms-rail-item",
            "data-active": filter === "favorites",
            "data-favorite": "true",
            title: copy.favorites,
            "aria-label": copy.favorites,
            "aria-pressed": filter === "favorites",
            onClick: () => {
              setFilter("favorites");
              setQuery("");
            }
          },
          /* @__PURE__ */ React3.createElement(StarIcon, { size: 17, filled: filter === "favorites" })
        ), /* @__PURE__ */ React3.createElement("span", { className: "nms-rail-sep", "aria-hidden": "true" }), brands.map((brand) => /* @__PURE__ */ React3.createElement(
          "button",
          {
            key: brand.key,
            type: "button",
            className: "nms-rail-item",
            "data-active": filter === brand.key,
            title: `${brand.name} (${copy.modelCount(brand.count)})`,
            "aria-label": `${brand.name} (${copy.modelCount(brand.count)})`,
            "aria-pressed": filter === brand.key,
            onClick: () => {
              setFilter(brand.key);
              setQuery("");
            }
          },
          /* @__PURE__ */ React3.createElement(BrandMark, { brandKey: brand.key, brandName: brand.name })
        ))), /* @__PURE__ */ React3.createElement("section", { className: "nms-main" }, /* @__PURE__ */ React3.createElement("div", { className: "nms-scroll" }, state.status === "loading" && allModels.length === 0 && /* @__PURE__ */ React3.createElement("div", { className: "nms-loading" }, /* @__PURE__ */ React3.createElement("span", { className: "nms-pending-dot" }), copy.loading), state.error !== null && /* @__PURE__ */ React3.createElement("div", { className: "nms-error" }, /* @__PURE__ */ React3.createElement(WarningIcon, { size: 14 }), /* @__PURE__ */ React3.createElement("span", { className: "nms-error-copy" }, copy.loadError, ": ", state.error), /* @__PURE__ */ React3.createElement("button", { type: "button", className: "nms-retry", onClick: refresh }, copy.retry)), visibleFavorites.length > 0 && /* @__PURE__ */ React3.createElement("div", null, /* @__PURE__ */ React3.createElement("div", { className: "nms-group" }, /* @__PURE__ */ React3.createElement(StarIcon, { className: "nms-group-star", size: 12, filled: true }), copy.favorites, /* @__PURE__ */ React3.createElement("span", { className: "nms-group-count" }, copy.favoriteCount(visibleFavorites.length))), visibleFavorites.map((item) => renderModel(item))), filter !== "favorites" && visibleGroups.map((group) => /* @__PURE__ */ React3.createElement("div", { key: group.id }, /* @__PURE__ */ React3.createElement("div", { className: "nms-group" }, group.name, /* @__PURE__ */ React3.createElement("span", { className: "nms-group-count" }, copy.modelCount(group.models.length))), group.models.map((item) => renderModel(item)))), visibleCount === 0 && state.status !== "loading" && /* @__PURE__ */ React3.createElement("div", { className: "nms-empty" }, /* @__PURE__ */ React3.createElement("span", { className: "nms-empty-icon" }, filter === "favorites" ? /* @__PURE__ */ React3.createElement(StarIcon, { size: 17 }) : /* @__PURE__ */ React3.createElement(ModelIcon, { size: 17 })), filter === "favorites" && favorites.length === 0 ? copy.noFavorites : query !== "" ? copy.noMatches : copy.noModels), (state.failures ?? []).map((failure) => /* @__PURE__ */ React3.createElement("div", { className: "nms-error", key: failure.id }, /* @__PURE__ */ React3.createElement(WarningIcon, { size: 14 }), /* @__PURE__ */ React3.createElement("span", { className: "nms-error-copy" }, copy.providerFailure(failure.name, failure.message)), /* @__PURE__ */ React3.createElement("button", { type: "button", className: "nms-retry", onClick: refresh }, copy.retry)))), /* @__PURE__ */ React3.createElement("footer", { className: "nms-effort" }, /* @__PURE__ */ React3.createElement("span", { className: "nms-effort-label" }, copy.effort), current === null || currentItem === void 0 ? /* @__PURE__ */ React3.createElement("span", { className: "nms-effort-note" }, copy.selectModel) : currentReasoning === void 0 ? /* @__PURE__ */ React3.createElement("span", { className: "nms-effort-note" }, copy.noEffort) : /* @__PURE__ */ React3.createElement("div", { className: "nms-effort-list", role: "group", "aria-label": copy.effort }, effortChoices.map((level) => /* @__PURE__ */ React3.createElement(
          "button",
          {
            key: level.id ?? "default",
            type: "button",
            className: "nms-effort-button",
            "data-active": effectiveEffort === level.id,
            title: level.description ?? level.name,
            disabled: busy,
            onClick: () => chooseEffort(level.id)
          },
          level.name
        ))))))
      ),
      document.body
    ), toast !== null && /* @__PURE__ */ React3.createElement("div", { className: "nms-toast", role: "status", key: toast.seq }, toast.text));
    function renderModel(item) {
      const selected = current?.provider === item.group.id && current.model === item.model.id;
      const pending = state.pending?.provider === item.group.id && state.pending.model === item.model.id;
      const context = formatTokens(item.details?.contextWindow);
      const maxOutput = formatTokens(item.details?.maxTokens);
      const inputs = item.details?.inputModalities;
      const badge = item.model.badge ?? item.details?.badge;
      const description = item.model.description ?? item.details?.description;
      const meta = [
        item.brandName,
        context === "" ? "" : `${copy.context} ${context}`,
        maxOutput === "" ? "" : `${copy.maxOutput} ${maxOutput}`,
        ...Array.isArray(inputs) ? inputs.map((value) => value === "image" ? copy.imageInput : value === "text" ? copy.textInput : value) : []
      ].filter(Boolean).join(" \xB7 ");
      return /* @__PURE__ */ React3.createElement("div", { className: "nms-model-row", "data-active": selected, "data-pending": pending, key: item.key }, /* @__PURE__ */ React3.createElement("button", { type: "button", className: "nms-model-main", disabled: busy, title: description ?? item.model.name, onClick: () => chooseModel(item) }, /* @__PURE__ */ React3.createElement("span", { className: "nms-model-mark" }, /* @__PURE__ */ React3.createElement(BrandMark, { brandKey: item.brandKey, brandName: item.brandName })), /* @__PURE__ */ React3.createElement("span", { className: "nms-model-copy" }, /* @__PURE__ */ React3.createElement("span", { className: "nms-model-line" }, /* @__PURE__ */ React3.createElement("span", { className: "nms-model-name" }, item.model.name), badge !== void 0 && /* @__PURE__ */ React3.createElement("span", { className: `nms-tag nms-tag-${badge.tone ?? "neutral"}` }, resolveText(badge.text) || textValue(badge.text)), context !== "" && /* @__PURE__ */ React3.createElement("span", { className: "nms-tag" }, context)), /* @__PURE__ */ React3.createElement("span", { className: "nms-model-desc" }, description ?? item.model.id), /* @__PURE__ */ React3.createElement("span", { className: "nms-model-meta" }, meta))), /* @__PURE__ */ React3.createElement("span", { className: "nms-model-side" }, pending && /* @__PURE__ */ React3.createElement("span", { className: "nms-pending-dot", "aria-label": copy.switching }), selected && !pending && /* @__PURE__ */ React3.createElement("span", { className: "nms-check" }, /* @__PURE__ */ React3.createElement(CheckIcon, { size: 16 })), /* @__PURE__ */ React3.createElement(
        "button",
        {
          type: "button",
          className: "nms-star",
          "data-active": favoriteSet.has(item.key),
          title: favoriteSet.has(item.key) ? copy.unfavorite : copy.favorite,
          "aria-label": favoriteSet.has(item.key) ? copy.unfavorite : copy.favorite,
          "aria-pressed": favoriteSet.has(item.key),
          onClick: (event) => toggleFavorite(item.key, event)
        },
        /* @__PURE__ */ React3.createElement(StarIcon, { size: 15, filled: favoriteSet.has(item.key) })
      )));
    }
  }

  // src/client/index.jsx
  var inject = ["slots", "modelDirectories", "sessions", "locale"];
  function apply(ctx) {
    ctx.slots.inject("conversation.input.model", () => ctx.slots.register({
      name: "conversation.input.model",
      priority: -1,
      registrant: "nano-model-selector",
      inject: (sessionId) => {
        const directory = ctx.modelDirectories.directoryFor(sessionId);
        const available = ctx.sessions.subagentAddress(sessionId) === void 0;
        return {
          available,
          directory,
          load: () => {
            if (available) directory.load().catch(() => {
            });
          },
          select: (selection) => available ? directory.select(selection) : Promise.resolve(void 0),
          language: {
            current: () => ctx.locale.getSnapshot().active,
            subscribe: (listener) => ctx.on("locale/change", listener)
          },
          resolveText: (text) => ctx.locale.resolveText(text)
        };
      }
    }, ModelSelector));
  }

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
