<template>
  <t-dialog
    v-model:visible="visible"
    :footer="false"
    :header="title"
    mode="modeless"
    :close-btn="true"
    @close="handleClose"
    @confirm="handleClose"
  >
    <template #header>
      <div class="chat-header">
        <div class="chat-title">{{ title }}</div>
        <div class="header-actions">
          <t-tooltip content="设置系统提示词">
            <t-button
              theme="default"
              variant="text"
              shape="square"
              @click="showSettings"
            >
              <template #icon>
                <t-icon name="setting" />
              </template>
            </t-button>
          </t-tooltip>
          <t-tooltip content="查看已生成卡片 (Alt + C)">
            <t-button
              theme="default"
              variant="text"
              shape="square"
              @click="showCardsDrawer = true"
            >
              <template #icon>
                <t-icon name="layers" />
              </template>
            </t-button>
          </t-tooltip>
          <div class="model-selector-wrapper">
            <t-tooltip content="选择 AI 模型">
              <t-select
                v-model="currentModel"
                :options="modelOptions"
                size="small"
                class="model-selector"
                :popup-props="{
                  overlayClassName: 'model-selector-popup',
                  overlayInnerStyle: { padding: '4px' },
                }"
              >
                <template #prefixIcon>
                  <t-icon
                    name="control-platform"
                    style="color: var(--td-brand-color)"
                  />
                </template>
                <template #suffixIcon>
                  <!-- 移除箭头图标 -->
                </template>
              </t-select>
            </t-tooltip>
          </div>
        </div>
      </div>
    </template>
    <template #body>
      <t-chat
        :style="{ height }"
        :clear-history="chatList.length > 0 && !isStreamLoad && showClear"
        @on-action="operation"
        @clear="handleClear"
      >
        <template v-for="(item, index) in chatList" :key="index">
          <t-chat-item
            :avatar="item.avatar"
            :name="item.name"
            :role="item.role"
            :datetime="item.datetime"
            :content="item.content"
            :text-loading="index === 0 && loading"
          >
            <template
              #actions
              v-if="
                item.role === 'assistant' &&
                !(index === 0 && (loading || isStreamLoad))
              "
            >
              <t-space>
                <t-button
                  theme="default"
                  variant="text"
                  size="small"
                  @click="copyContent(item.content)"
                >
                  <template #icon><t-icon name="file-copy" /></template>
                  复制
                </t-button>
                <t-button
                  theme="default"
                  variant="text"
                  size="small"
                  :loading="cardsGenerating"
                  @click="generateCards(item)"
                >
                  <template #icon><t-icon name="layers" /></template>
                  生成卡片
                </t-button>
                <t-dropdown
                  trigger="click"
                  :min-column-width="100"
                  :options="
                    modelOptions.map((opt) => ({
                      content: opt.label,
                      value: opt.value,
                      onClick: () => regenerateWithModel(opt.value),
                    }))
                  "
                >
                  <t-button theme="default" variant="text" size="small">
                    <template #icon><t-icon name="refresh" /></template>
                    重新生成
                    <t-icon
                      name="chevron-down"
                      size="small"
                      style="margin-left: 4px"
                    />
                  </t-button>
                </t-dropdown>
                <t-button
                  v-if="item.history?.length"
                  theme="default"
                  variant="text"
                  size="small"
                  @click="switchHistory(item)"
                >
                  <template #icon><t-icon name="swap" /></template>
                  切换历史回复({{ item.history.length }})
                </t-button>
              </t-space>
            </template>
          </t-chat-item>
        </template>
        <template #footer>
          <t-chat-input
            :stop-disabled="isStreamLoad"
            @send="handleSend"
            @stop="handleStop"
          >
          </t-chat-input>
        </template>
      </t-chat>
    </template>
  </t-dialog>

  <!-- 修改卡片预览抽屉 -->
  <Drawer
    v-model:visible="showCardsDrawer"
    :width="500"
    :mask="true"
    :closable="true"
    :footer="false"
    :unmount-on-close="false"
    @cancel="showCardsDrawer = false"
  >
    <template #title>
      <div class="drawer-header">
        <div class="drawer-title">
          已生成的卡片 ({{ currentCards.length }}张)
        </div>
        <div class="drawer-actions">
          <a-button
            type="text"
            status="danger"
            size="small"
            @click="clearAllCards"
            v-if="currentCards.length > 0"
          >
            <template #icon><icon-delete /></template>
            清空
          </a-button>
        </div>
      </div>
    </template>
    <div class="cards-preview">
      <div v-if="currentCards.length === 0" class="empty-state">
        还没有生成任何卡片
      </div>
      <div v-else class="cards-list">
        <div
          v-for="(card, index) in currentCards"
          :key="index"
          class="card-item"
        >
          <div class="card-content">
            <div class="card-question">
              <strong>问题: </strong>
              {{ card.question }}
            </div>
            <div class="card-answer">
              <strong>答案: </strong>
              {{ card.answer }}
            </div>
            <div class="card-tags">
              <strong>标签: </strong>
              {{ card.tags.join(", ") }}
            </div>
          </div>
          <div class="card-actions">
            <a-button
              type="text"
              status="danger"
              size="mini"
              @click="deleteCard(index)"
            >
              <template #icon><icon-delete /></template>
            </a-button>
          </div>
        </div>
      </div>
    </div>
  </Drawer>

  <!-- 添加系统提示词设置对话框 -->
  <t-dialog
    v-model:visible="isSettingVisible"
    header="系统提示词管理"
    :footer="false"
    width="540"
  >
    <div class="prompts-manager">
      <div class="prompts-list">
        <div class="prompts-header">
          <span class="section-title">提示词列表</span>
          <t-button theme="primary" size="small" @click="addNewPrompt">
            <template #icon>
              <t-icon name="add" />
            </template>
            新建提示词
          </t-button>
        </div>
        <t-list>
          <t-list-item
            v-for="prompt in prompts"
            :key="prompt.id"
            :class="{
              'active-prompt': currentPromptId === prompt.id,
              'system-preset': prompt.id === 'system-preset',
            }"
          >
            <div class="prompt-item">
              <div class="prompt-info" @click="selectPrompt(prompt.id)">
                <span class="prompt-name">{{ prompt.name }}</span>
              </div>
              <div class="prompt-actions" v-if="prompt.id !== 'system-preset'">
                <t-button
                  theme="default"
                  variant="text"
                  size="small"
                  @click="editPrompt(prompt)"
                >
                  <template #icon><t-icon name="edit" /></template>
                </t-button>
                <t-button
                  theme="danger"
                  variant="text"
                  size="small"
                  @click="deletePrompt(prompt.id)"
                >
                  <template #icon><t-icon name="delete" /></template>
                </t-button>
              </div>
            </div>
          </t-list-item>
        </t-list>
      </div>
      <div class="prompt-editor">
        <span class="section-title">{{
          isNewPrompt ? "新建提示词" : "编辑提示词"
        }}</span>
        <t-input
          v-model="editingPrompt.name"
          class="prompt-name-input"
          placeholder="请输入提示词名称"
        />
        <t-textarea
          v-model="editingPrompt.content"
          class="prompt-content-input"
          placeholder="请输入提示词内容..."
          :autosize="{ minRows: 10, maxRows: 15 }"
        />
        <div class="editor-actions">
          <t-button
            theme="default"
            @click="editingPrompt = { id: '', name: '', content: '' }"
          >
            清空
          </t-button>
          <t-button theme="primary" @click="savePrompt"> 保存 </t-button>
        </div>
      </div>
    </div>
  </t-dialog>
</template>

<script setup lang="ts">
import {
  ref,
  onMounted,
  defineProps,
  defineEmits,
  watch,
  defineExpose,
  withDefaults,
  computed,
  h,
  onUnmounted,
} from "vue";
import { eventStreamService } from "@/services/EventStreamService";
import { ChatControllerService } from "../../generated/services/ChatControllerService";
import { AIChatRequest } from "../../generated/models/AIChatRequest";
import type { ChatMessage, ChatProps, ChatEvents } from "@/types/chat";
import { Message, Drawer } from "@arco-design/web-vue";
import { IconClose } from "@arco-design/web-vue/es/icon";

// 添加历史记录接口定义
interface HistoryResponse {
  content: string;
  datetime: string;
}

const props = withDefaults(defineProps<ChatProps>(), {
  userAvatar: "https://tdesign.gtimg.com/site/avatar.jpg",
  aiAvatar: "https://tdesign.gtimg.com/site/chat-avatar.png",
  userName: "自己",
  aiName: "AI助手",
  title: "AI助手",
  height: "600px",
  draggable: true,
  showClear: true,
});

const emit = defineEmits<ChatEvents>();

// 添加 localStorage 相关的常量
const STORAGE_KEY = "ai_chat_model";
const CARDS_STORAGE_KEY = "ai_generated_cards";

// 从 localStorage 获取保存的模型
const getSavedModel = (): AIChatRequest.model => {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? (saved as AIChatRequest.model) : AIChatRequest.model.BASIC;
};

// 保存模型选择到 localStorage
const saveModelSelection = (model: AIChatRequest.model) => {
  localStorage.setItem(STORAGE_KEY, model);
};

// 从 localStorage 获取保存的卡片
const loadSavedCards = () => {
  const saved = localStorage.getItem(CARDS_STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
};

// 保存卡片到 localStorage
const saveCards = (cards: any[]) => {
  localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(cards));
};

// 状态变量
const visible = ref(false);
const loading = ref(false);
const isStreamLoad = ref(false);
const currentSessionId = ref<string>("");
const currentRequestId = ref<string>("");
const showCardsDrawer = ref(false);
const currentCards = ref<any[]>(loadSavedCards());
const cardsGenerating = ref(false);
const currentModel = ref<AIChatRequest.model>(getSavedModel());

// 定义可用的模型列表
const modelOptions = [
  { value: AIChatRequest.model.BASIC, label: "基础模型" },
  { value: AIChatRequest.model.A1, label: "A1 模型" },
  { value: AIChatRequest.model.A2, label: "A2 模型" },
  { value: AIChatRequest.model.PLUS, label: "Plus 模型" },
  { value: AIChatRequest.model.GEMINI_1_5_PRO_EXP, label: "Gemini 1.5 Pro" },
  { value: AIChatRequest.model.GEMINI_2_0_FLASH_EXP, label: "Gemini 2.0" },
];

// 监听模型变化并保存
watch(currentModel, (newModel) => {
  saveModelSelection(newModel);
});

// 添加提示词管理相关的代码
interface PromptItem {
  id: string;
  name: string;
  content: string;
}

const PROMPTS_STORAGE_KEY = "ai_chat_prompts";
const CURRENT_PROMPT_KEY = "ai_chat_current_prompt";

// 添加系统预设提示词
const SYSTEM_PRESET_PROMPT: PromptItem = {
  id: "system-preset",
  name: "系统预设",
  content: `你是一个专业的教育辅导助手，负责审查和优化用户创建的闪卡内容。你的主要任务包括：

1. 验证内容准确性：检查问题和答案中的事实、概念和解释是否准确。
2. 评估完整性：确保答案完整地回答了问题，包含了必要的细节和解释。
3. 检查语言流畅性：确保问题和答案表述清晰、简洁、易懂。
4. 提供优化建议：针对内容、结构和表达方式提供改进建议，使其更适合 Anki 复习。

请以专业、友好的语气提供反馈，并给出具体的修改建议。`,
};

// 从 localStorage 获取保存的所有提示词
const getSavedPrompts = (): PromptItem[] => {
  const saved = localStorage.getItem(PROMPTS_STORAGE_KEY);
  const userPrompts = saved ? JSON.parse(saved) : [];
  return [SYSTEM_PRESET_PROMPT, ...userPrompts];
};

// 从 localStorage 获取当前选中的提示词 ID
const getCurrentPromptId = (): string => {
  return localStorage.getItem(CURRENT_PROMPT_KEY) || "";
};

// 保存所有提示词到 localStorage
const savePrompts = (prompts: PromptItem[]) => {
  const userPrompts = prompts.filter((p) => p.id !== SYSTEM_PRESET_PROMPT.id);
  localStorage.setItem(PROMPTS_STORAGE_KEY, JSON.stringify(userPrompts));
};

// 保存当前选中的提示词 ID
const saveCurrentPromptId = (id: string) => {
  localStorage.setItem(CURRENT_PROMPT_KEY, id);
};

// 提示词列表状态
const prompts = ref<PromptItem[]>(getSavedPrompts());
const currentPromptId = ref<string>(getCurrentPromptId());
const isSettingVisible = ref(false);
const editingPrompt = ref<PromptItem>({
  id: "",
  name: "",
  content: "",
});
const isNewPrompt = ref(false);

// 计算当前的系统提示词内容
const systemPrompt = computed(() => {
  // 如果选择的是系统预设，返回空字符串
  if (currentPromptId.value === SYSTEM_PRESET_PROMPT.id) {
    return "";
  }
  const current = prompts.value.find((p) => p.id === currentPromptId.value);
  return current?.content || "";
});

// 打开设置对话框
const showSettings = () => {
  isSettingVisible.value = true;
};

// 添加新提示词
const addNewPrompt = () => {
  isNewPrompt.value = true;
  editingPrompt.value = {
    id: generateUUID(),
    name: "",
    content: "",
  };
};

// 编辑提示词
const editPrompt = (prompt: PromptItem) => {
  isNewPrompt.value = false;
  editingPrompt.value = { ...prompt };
};

// 删除提示词
const deletePrompt = (id: string) => {
  if (id === SYSTEM_PRESET_PROMPT.id) return; // 防止删除系统预设
  prompts.value = prompts.value.filter((p) => p.id !== id);
  if (currentPromptId.value === id) {
    currentPromptId.value = "";
  }
  savePrompts(prompts.value);
  saveCurrentPromptId(currentPromptId.value);
  Message.success("删除提示词成功");
};

// 保存提示词
const savePrompt = () => {
  if (!editingPrompt.value.name.trim() || !editingPrompt.value.content.trim()) {
    Message.warning("请填写提示词名称和内容");
    return;
  }

  if (isNewPrompt.value) {
    prompts.value.push({ ...editingPrompt.value });
    Message.success("新建提示词成功");
  } else {
    const index = prompts.value.findIndex(
      (p) => p.id === editingPrompt.value.id
    );
    if (index !== -1) {
      prompts.value[index] = { ...editingPrompt.value };
      Message.success("更新提示词成功");
    }
  }

  savePrompts(prompts.value);
  editingPrompt.value = { id: "", name: "", content: "" };
};

// 选择提示词
const selectPrompt = (id: string) => {
  currentPromptId.value = id;
  saveCurrentPromptId(id);

  // 添加提示词切换消息
  const selectedPrompt = prompts.value.find((p) => p.id === id);
  if (selectedPrompt) {
    Message.success(`已切换到${selectedPrompt.name}提示词`);
    chatList.value.unshift({
      avatar: props.aiAvatar,
      name: props.aiName,
      datetime: new Date().toLocaleString(),
      content: `已切换到${selectedPrompt.name}提示词`,
      role: "model-change",
    });
  }
};

// 生成卡片的方法
const generateCards = async (item: ChatMessage) => {
  try {
    console.log("Starting card generation...");
    cardsGenerating.value = true;

    // 查找当前 AI 回复对应的用户问题
    const currentIndex = chatList.value.findIndex((msg) => msg === item);
    const userQuestion = chatList.value[currentIndex + 1];

    if (!userQuestion || userQuestion.role !== "user") {
      Message.warning("未找到对应的问题");
      return;
    }

    // 组合问题和回答
    const combinedContent = `问题：${userQuestion.content}\n\n回答：${item.content}`;

    const res = await ChatControllerService.getCards({
      model: currentModel.value,
      content: combinedContent,
      sessionId: currentSessionId.value,
      prompt: systemPrompt.value || undefined,
    });

    console.log("API response:", res);

    if (res.code == 200 && res.data) {
      const requestId = res.data;
      console.log("Got requestId:", requestId);

      try {
        const result = await eventStreamService.waitForResult(requestId);
        console.log("Cards result:", result);

        if (result && result.cards && result.cards.length > 0) {
          console.log("Setting cards data:", result.cards);
          currentCards.value = [...result.cards, ...currentCards.value];
          saveCards(currentCards.value);
          console.log("Cards data set, showing drawer...");
          showCardsDrawer.value = true;
          console.log("Drawer should be visible now");
          Message.success(`成功生成 ${result.cards.length} 张卡片`);
        } else {
          console.warn("No cards in result:", result);
          Message.warning("未生成任何卡片");
        }
      } catch (waitError) {
        console.error("Error waiting for result:", waitError);
        throw waitError;
      }
    }
  } catch (error) {
    console.error("Generate cards error:", error);
    Message.error("生成卡片失败");
  } finally {
    cardsGenerating.value = false;
  }
};

// 删除卡片
const deleteCard = (index: number) => {
  currentCards.value.splice(index, 1);
  saveCards(currentCards.value);
  Message.success("删除成功");
};

// 清空所有卡片
const clearAllCards = () => {
  currentCards.value = [];
  saveCards(currentCards.value);
  showCardsDrawer.value = false;
  Message.success("已清空所有卡片");
};

// 添加快捷键处理
const handleKeyDown = (e: KeyboardEvent) => {
  // Alt + C 打开卡片抽屉
  if (e.altKey && e.key.toLowerCase() === "c") {
    e.preventDefault();
    showCardsDrawer.value = true;
  }
};

// 在组件挂载时添加快捷键监听
onMounted(() => {
  document.addEventListener("keydown", handleKeyDown);
});

// 在组件卸载时移除快捷键监听
onUnmounted(() => {
  document.removeEventListener("keydown", handleKeyDown);
});

// 监听 showCardsDrawer 的变化
watch(showCardsDrawer, (newVal) => {
  console.log(
    "showCardsDrawer changed:",
    newVal,
    "currentCards:",
    currentCards.value
  );
});

// 监听 currentCards 的变化
watch(
  currentCards,
  (newVal) => {
    console.log("currentCards changed:", newVal);
    if (newVal.length > 0) {
      console.log("Attempting to show drawer...");
      showCardsDrawer.value = true;
    }
  },
  { deep: true }
);

// 处理操作
const operation = (type: string, options: any) => {
  console.log(type, options);
};

// 处理清空历史
const handleClear = () => {
  chatList.value = [];
  currentSessionId.value = generateUUID();
  emit("clear");
};

// 处理停止生成
const handleStop = () => {
  if (isStreamLoad.value && currentRequestId.value) {
    eventStreamService.cancelRequest(currentRequestId.value);
    loading.value = false;
    isStreamLoad.value = false;
    emit("stop");
  }
};

// 处理关闭对话框
const handleClose = () => {
  visible.value = false;
  emit("close");
};

// 生成UUID
const generateUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// 聊天消息列表
const chatList = ref<(ChatMessage & { history?: HistoryResponse[] })[]>(
  props.initialMessages || [
    {
      avatar: props.aiAvatar,
      name: props.aiName,
      datetime: new Date().toLocaleString(),
      content: "你好！我是AI助手，有什么我可以帮你的吗？",
      role: "assistant",
    },
  ]
);

// 处理发送消息
const handleSend = async (inputValue: string) => {
  if (isStreamLoad.value || !inputValue) return;

  if (!currentSessionId.value) {
    currentSessionId.value = generateUUID();
  }

  const userMessage: ChatMessage = {
    avatar: props.userAvatar,
    name: props.userName,
    datetime: new Date().toLocaleString(),
    content: inputValue,
    role: "user",
  };
  chatList.value.unshift(userMessage);

  const aiMessage: ChatMessage = {
    avatar: props.aiAvatar,
    name: props.aiName,
    datetime: new Date().toLocaleString(),
    content: "",
    role: "assistant",
  };
  chatList.value.unshift(aiMessage);

  try {
    loading.value = true;
    isStreamLoad.value = true;
    const lastItem = chatList.value[0];

    const res = await ChatControllerService.chat({
      model: currentModel.value,
      content: inputValue,
      sessionId: currentSessionId.value,
      prompt: systemPrompt.value || undefined,
    });

    if (res.code == 200 && res.data) {
      currentRequestId.value = res.data;
      emit("send", inputValue);

      let accumulatedContent = "";
      await eventStreamService.waitForStreamingResult(
        currentRequestId.value,
        (newContent: string) => {
          loading.value = false;
          const addedContent = newContent.slice(accumulatedContent.length);
          accumulatedContent = newContent;
          if (lastItem && lastItem.role === "assistant") {
            lastItem.content = newContent;
          }
        }
      );
    }
  } catch (error) {
    console.error("Chat error:", error);
    if (chatList.value[0] && chatList.value[0].role === "assistant") {
      chatList.value[0].content = "抱歉，发生了错误，请稍后重试";
    }
  } finally {
    loading.value = false;
    isStreamLoad.value = false;
  }
};

// 添加 sendMessage 方法
const sendMessage = async (message: string) => {
  if (isStreamLoad.value) return;
  await handleSend(message);
};

// 复制内容到剪贴板
const copyContent = async (content: string) => {
  try {
    await navigator.clipboard.writeText(content);
    Message.success("复制成功");
  } catch (err) {
    Message.error("复制失败");
  }
};

// 重新生成回复
const regenerateWithModel = async (model: AIChatRequest.model) => {
  if (isStreamLoad.value || chatList.value.length < 2) return;

  const lastUserMessage = chatList.value.find((msg) => msg.role === "user");
  if (!lastUserMessage) return;

  currentModel.value = model;
  const res = await ChatControllerService.chat({
    model: currentModel.value,
    content: lastUserMessage.content,
    sessionId: currentSessionId.value,
    prompt: systemPrompt.value || undefined,
  });

  if (res.code == 200 && res.data) {
    currentRequestId.value = res.data;
    loading.value = true;
    isStreamLoad.value = true;

    const aiMessage: ChatMessage = {
      avatar: props.aiAvatar,
      name: props.aiName,
      datetime: new Date().toLocaleString(),
      content: "",
      role: "assistant",
    };
    chatList.value.unshift(aiMessage);

    try {
      let accumulatedContent = "";
      await eventStreamService.waitForStreamingResult(
        currentRequestId.value,
        (newContent: string) => {
          loading.value = false;
          const addedContent = newContent.slice(accumulatedContent.length);
          accumulatedContent = newContent;
          if (chatList.value[0] && chatList.value[0].role === "assistant") {
            chatList.value[0].content = newContent;
          }
        }
      );
    } catch (error) {
      console.error("Regenerate error:", error);
      if (chatList.value[0] && chatList.value[0].role === "assistant") {
        chatList.value[0].content = "抱歉，发生了错误，请稍后重试";
      }
    } finally {
      loading.value = false;
      isStreamLoad.value = false;
    }
  }
};

// 切换历史回复
const switchHistory = (item: ChatMessage & { history?: HistoryResponse[] }) => {
  if (!item.history?.length) return;

  const currentContent = item.content;
  const currentDatetime = item.datetime;

  item.history.push({
    content: currentContent,
    datetime: currentDatetime,
  });

  const lastHistory = item.history.shift()!;
  item.content = lastHistory.content;
  item.datetime = lastHistory.datetime;
};

// 暴露方法给父组件
defineExpose({
  show: () => (visible.value = true),
  hide: () => (visible.value = false),
  clear: handleClear,
  sendMessage,
});
</script>

<style scoped>
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  padding: 0;
}

.chat-title {
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: 500;
  color: var(--td-text-color-primary);
}

.model-selector-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  height: 32px;
}

.model-selector {
  width: 180px;
  transition: all 0.3s ease;
  height: 100%;
}

.model-selector :deep(.t-select-input) {
  background: transparent;
  border: none;
  border-radius: 8px;
  height: 100%;
  padding: 0 8px;
  padding-right: 4px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
}

.model-selector :deep(.t-input__wrap) {
  border: none !important;
  background: transparent !important;
  height: 100%;
  display: flex;
  align-items: center;
}

.model-selector :deep(.t-input) {
  border: none !important;
  background: transparent !important;
  height: 100%;
  display: flex;
  align-items: center;
}

.model-selector :deep(.t-select-input:hover) {
  background: var(--td-bg-color-container-hover);
}

.model-selector :deep(.t-select-input--active) {
  background: var(--td-bg-color-container-hover);
}

.model-selector :deep(.t-select-input__prefix-icon) {
  color: var(--td-brand-color);
  font-size: 18px;
  margin-right: 8px;
}

.model-selector :deep(.t-select-input__suffix-icon) {
  display: none;
}

.model-selector :deep(.t-select-input--active .t-select-input__suffix-icon) {
  display: none;
}

:deep(.model-selector-popup) {
  min-width: 180px !important;

  .t-select-option {
    margin: 2px 4px;
    padding: 8px 12px;
    border-radius: 6px;
    transition: all 0.2s ease;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    &:hover {
      background: var(--td-bg-color-container-hover);
      transform: translateX(4px);
    }

    &.t-is-selected {
      color: var(--td-brand-color);
      background: var(--td-brand-color-light);
      font-weight: 500;
    }
  }
}

:deep(.t-dialog__close) {
  right: 16px;
  top: 16px;
}

.t-chat {
  background: var(--td-bg-color-container);
  border-radius: var(--td-radius-medium);
}

:deep(.t-dialog__header) {
  border-bottom: none;
  padding: 16px 20px;
  margin: 0;
}

:deep(.t-dialog__header-content) {
  padding: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 32px;
}

.header-actions :deep(.t-button) {
  color: var(--td-text-color-secondary);

  &:hover {
    color: var(--td-brand-color);
    background: var(--td-bg-color-container-hover);
  }
}

.prompts-manager {
  display: flex;
  gap: 20px;
  height: 410px;
}

.prompts-list {
  width: 200px;
  border-right: 1px solid var(--td-component-border);
  padding-right: 20px;
  display: flex;
  flex-direction: column;
}

.prompts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--td-text-color-primary);
}

.prompt-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.prompt-info {
  flex: 1;
  min-width: 0;
  padding: 8px 12px;
  cursor: pointer;
}

.prompt-name {
  font-size: 14px;
  color: var(--td-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.prompt-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.3s ease;
  padding-right: 8px;
}

.prompt-item:hover {
  background: var(--td-bg-color-container-hover);
}

.prompt-item:hover .prompt-actions {
  opacity: 1;
}

.active-prompt {
  background: var(--td-brand-color-light);
}

.system-preset {
  background: var(--td-bg-color-container-select);
  border-left: 3px solid var(--td-brand-color);
  margin-bottom: 8px;
}

.system-preset .prompt-info {
  padding-left: 9px;
}

.system-preset:hover {
  background: var(--td-bg-color-container-select);
}

.prompt-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.prompt-name-input {
  margin-bottom: 8px;
}

.prompt-content-input {
  flex: 1;
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.drawer-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--color-text-1);
}

.cards-preview {
  padding: 16px;
  height: calc(100vh - 55px);
  overflow-y: auto;
}

.card-item {
  background: var(--color-bg-2);
  border: 1px solid var(--color-neutral-3);
  border-radius: 4px;
  padding: 16px;
  margin-bottom: 16px;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  &:last-child {
    margin-bottom: 0;
  }
}

.card-question,
.card-answer {
  margin-bottom: 12px;
  line-height: 1.6;

  strong {
    color: var(--color-text-3);
    margin-right: 8px;
  }
}

.card-tags {
  color: var(--color-text-3);
  font-size: 13px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--color-neutral-3);

  strong {
    margin-right: 8px;
  }
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.drawer-actions {
  display: flex;
  gap: 8px;
}

.empty-state {
  text-align: center;
  color: var(--color-text-3);
  padding: 32px 16px;
}

.card-item {
  display: flex;
  gap: 8px;
}

.card-content {
  flex: 1;
}

.card-actions {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.card-item:hover .card-actions {
  opacity: 1;
}

.card-actions :deep(.arco-btn) {
  padding: 0 4px;
}
</style>
