<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import Card from "@/components/ui/Card.vue";
import CardHeader from "@/components/ui/CardHeader.vue";
import CardTitle from "@/components/ui/CardTitle.vue";
import CardContent from "@/components/ui/CardContent.vue";
import Input from "@/components/ui/Input.vue";
import Button from "@/components/ui/Button.vue";
import Alert from "@/components/ui/Alert.vue";

const router = useRouter();
const auth = useAuthStore();
const email = ref("");
const password = ref("");
const isSignUp = ref(false);
const submitting = ref(false);

async function submit() {
  submitting.value = true;
  auth.error = null;
  try {
    if (isSignUp.value) {
      await auth.signUp(email.value, password.value);
    } else {
      await auth.signIn(email.value, password.value);
    }
    router.push("/connectors");
  } catch {
    /* error shown via auth.error */
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-muted/30 p-4">
    <Card class="w-full max-w-md">
      <CardHeader>
        <CardTitle>Unify — Sign {{ isSignUp ? "up" : "in" }}</CardTitle>
        <p class="text-sm text-muted-foreground">
          AI-native integration platform for HighLevel
        </p>
      </CardHeader>
      <CardContent class="space-y-4">
        <Alert v-if="auth.error" variant="destructive">{{ auth.error }}</Alert>
        <Input v-model="email" type="email" placeholder="Email" />
        <Input v-model="password" type="password" placeholder="Password" />
        <Button class="w-full" :disabled="submitting" @click="submit">
          {{ submitting ? "Please wait..." : isSignUp ? "Create account" : "Sign in" }}
        </Button>
        <button
          type="button"
          class="w-full text-center text-sm text-primary hover:underline"
          @click="isSignUp = !isSignUp"
        >
          {{ isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up" }}
        </button>
      </CardContent>
    </Card>
  </div>
</template>
